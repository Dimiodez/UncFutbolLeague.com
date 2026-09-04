import { json } from '../_lib/auth.js';
import { ensureCompetitions } from '../_lib/competitions.js';
import { ensureAdminOperations } from '../_lib/admin-operations.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ events: [] });
  await ensureCompetitions(env);
  await ensureAdminOperations(env);
  const destination = new URL(request.url).searchParams.get('destination');
  const calendar = new URL(request.url).searchParams.get('calendar') === '1';
  if (!calendar && !['community-events', 'league-cup'].includes(destination)) return json({ error: 'Invalid destination.' }, 400);
  const select = `SELECT c.id,c.title,c.destination,c.format,c.starts_at AS startsAt,c.snapshot_json AS snapshotJson,c.updated_at AS updatedAt,COALESCE(l.lifecycle_status,'upcoming') AS lifecycleStatus FROM competitions c LEFT JOIN competition_lifecycle l ON l.competition_id=c.id`;
  const result = calendar
    ? await env.DB.prepare(`${select} WHERE c.status='published' AND COALESCE(l.lifecycle_status,'upcoming') IN ('upcoming','live') ORDER BY CASE WHEN l.lifecycle_status='live' THEN 0 ELSE 1 END,COALESCE(c.starts_at,c.updated_at) LIMIT 6`).all()
    : await env.DB.prepare(`${select} WHERE c.status='published' AND c.destination=? AND COALESCE(l.lifecycle_status,'upcoming')<>'archived' ORDER BY COALESCE(c.starts_at,c.updated_at)`).bind(destination).all();
  return json({ events: result.results.map(row => ({ ...row, snapshot: JSON.parse(row.snapshotJson), snapshotJson: undefined })) }, 200, { 'cache-control': 'public, max-age=30' });
}
