import { json } from '../_lib/auth.js';
import { ensureCompetitions } from '../_lib/competitions.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ events: [] });
  await ensureCompetitions(env);
  const destination = new URL(request.url).searchParams.get('destination');
  if (!['community-events', 'league-cup'].includes(destination)) return json({ error: 'Invalid destination.' }, 400);
  const result = await env.DB.prepare(`SELECT id, title, destination, format, starts_at AS startsAt, snapshot_json AS snapshotJson, updated_at AS updatedAt FROM competitions WHERE status='published' AND destination=? ORDER BY COALESCE(starts_at, updated_at)`).bind(destination).all();
  return json({ events: result.results.map(row => ({ ...row, snapshot: JSON.parse(row.snapshotJson), snapshotJson: undefined })) }, 200, { 'cache-control': 'public, max-age=30' });
}
