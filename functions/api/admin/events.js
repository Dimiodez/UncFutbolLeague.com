import { getSession, json, sameOrigin } from '../../_lib/auth.js';
import { ensureCompetitions } from '../../_lib/competitions.js';
import { ensureAdminOperations } from '../../_lib/admin-operations.js';

const allowed = actor => actor && ['owner', 'admin'].includes(actor.role);
const fields = `c.id, c.title, c.destination, c.format, c.starts_at AS startsAt, c.status, c.snapshot_json AS snapshotJson, c.created_at AS createdAt, c.updated_at AS updatedAt, c.published_at AS publishedAt, COALESCE(l.lifecycle_status,'upcoming') AS lifecycleStatus`;

export async function onRequestGet({ request, env }) {
  const actor = await getSession(request, env);
  if (!allowed(actor)) return json({ error: 'Administrator access required.' }, 403);
  await ensureCompetitions(env);
  await ensureAdminOperations(env);
  const result = await env.DB.prepare(`SELECT ${fields} FROM competitions c LEFT JOIN competition_lifecycle l ON l.competition_id=c.id ORDER BY c.updated_at DESC`).all();
  return json({ events: result.results.map(row => ({ ...row, snapshot: JSON.parse(row.snapshotJson), snapshotJson: undefined })) });
}

export async function onRequestPost({ request, env }) {
  const actor = await getSession(request, env);
  if (!allowed(actor)) return json({ error: 'Administrator access required.' }, 403);
  await ensureCompetitions(env);
  await ensureAdminOperations(env);
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== 'string' || !body.title.trim()) return json({ error: 'Event title is required.' }, 400);
  if (!['community-events', 'league-cup'].includes(body.destination)) return json({ error: 'Choose a publication destination.' }, 400);
  if (!['draft', 'published'].includes(body.status) || !body.snapshot || typeof body.snapshot !== 'object') return json({ error: 'Invalid competition data.' }, 400);
  const snapshotJson = JSON.stringify(body.snapshot);
  if (snapshotJson.length > 500000) return json({ error: 'Competition data is too large.' }, 413);
  const id = typeof body.id === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(body.id) ? body.id : crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO competitions (id, title, destination, format, starts_at, status, snapshot_json, created_by, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title, destination=excluded.destination, format=excluded.format,
      starts_at=excluded.starts_at, status=excluded.status, snapshot_json=excluded.snapshot_json,
      updated_at=CURRENT_TIMESTAMP, published_at=CASE WHEN excluded.status='published' THEN COALESCE(competitions.published_at, CURRENT_TIMESTAMP) ELSE NULL END
  `).bind(id, body.title.trim().slice(0, 120), body.destination, String(body.format || 'event').slice(0, 40), body.startsAt || null, body.status, snapshotJson, String(actor.discord_id), body.status).run();
  await env.DB.prepare(`INSERT INTO audit_log (actor_discord_id, action, details) VALUES (?, 'competition_saved', ?)`).bind(String(actor.discord_id), JSON.stringify({ id, status: body.status, destination: body.destination })).run();
  if (body.status === 'published') await env.DB.prepare(`INSERT INTO competition_lifecycle (competition_id,lifecycle_status,updated_by) VALUES (?,'upcoming',?) ON CONFLICT(competition_id) DO NOTHING`).bind(id,String(actor.discord_id)).run();
  return json({ ok: true, id, status: body.status });
}

export async function onRequestDelete({ request, env }) {
  const actor = await getSession(request, env);
  if (!allowed(actor)) return json({ error: 'Administrator access required.' }, 403);
  await ensureCompetitions(env);
  await ensureAdminOperations(env);
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const id = new URL(request.url).searchParams.get('id') || '';
  const existing = await env.DB.prepare('SELECT title FROM competitions WHERE id = ?').bind(id).first();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM competition_lifecycle WHERE competition_id = ?').bind(id),
    env.DB.prepare('DELETE FROM competitions WHERE id = ?').bind(id),
    env.DB.prepare(`INSERT INTO audit_log (actor_discord_id, action, details) VALUES (?, 'competition_deleted', ?)`).bind(String(actor.discord_id), JSON.stringify({ id, title: existing?.title || '' }))
  ]);
  return json({ ok: true });
}
