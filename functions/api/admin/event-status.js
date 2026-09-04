import { getSession, json, sameOrigin } from '../../_lib/auth.js';
import { ensureCompetitions } from '../../_lib/competitions.js';
import { ensureAdminOperations } from '../../_lib/admin-operations.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const actor = await getSession(request, env);
  if (!actor || !['owner', 'admin'].includes(actor.role)) return json({ error: 'Administrator access required.' }, 403);
  await ensureCompetitions(env);
  await ensureAdminOperations(env);
  const body = await request.json().catch(() => null);
  const id = String(body?.id || '');
  const status = String(body?.status || '');
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id) || !['upcoming','live','completed','archived'].includes(status)) return json({ error: 'Invalid event status.' }, 400);
  const event = await env.DB.prepare(`SELECT id, status FROM competitions WHERE id=?`).bind(id).first();
  if (!event) return json({ error: 'Competition not found.' }, 404);
  if (event.status !== 'published') return json({ error: 'Publish this competition before changing its live status.' }, 400);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO competition_lifecycle (competition_id,lifecycle_status,updated_by) VALUES (?,?,?)
      ON CONFLICT(competition_id) DO UPDATE SET lifecycle_status=excluded.lifecycle_status,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).bind(id,status,String(actor.discord_id)),
    env.DB.prepare(`INSERT INTO audit_log (actor_discord_id,action,details) VALUES (?,'competition_status_changed',?)`).bind(String(actor.discord_id),JSON.stringify({id,status}))
  ]);
  return json({ ok:true, id, status });
}
