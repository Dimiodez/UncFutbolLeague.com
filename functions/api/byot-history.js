import { getSession, json, sameOrigin } from '../_lib/auth.js';
import { ensureByotHistory } from '../_lib/byot-history.js';

const statuses = ['upcoming','live','completed','archived'];
const clean = (value, max=120) => String(value || '').trim().slice(0,max);

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ records: [] });
  await ensureByotHistory(env);
  const result = await env.DB.prepare(`SELECT id,title,event_date AS eventDate,lifecycle_status AS lifecycleStatus,
    champion,finalist,champion_score AS championScore,finalist_score AS finalistScore,roster_json AS rosterJson,updated_at AS updatedAt
    FROM byot_history ORDER BY event_date DESC, updated_at DESC`).all();
  return json({ records: result.results.map(row=>({...row,roster:JSON.parse(row.rosterJson||'[]'),rosterJson:undefined})) }, 200, { 'cache-control': 'public, max-age=30' });
}

export async function onRequestPost({ request, env }) {
  const actor = await getSession(request, env);
  if (!actor || !['owner','admin'].includes(actor.role)) return json({ error: 'Administrator access required.' }, 403);
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const body = await request.json().catch(()=>null);
  const id = clean(body?.id,64);
  const title = clean(body?.title);
  const champion = clean(body?.champion,80);
  const finalist = clean(body?.finalist,80);
  const status = clean(body?.lifecycleStatus,20);
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(body?.eventDate||'') ? body.eventDate : null;
  const championScore = Number(body?.championScore), finalistScore = Number(body?.finalistScore);
  const roster = Array.isArray(body?.roster) ? body.roster.map(name=>clean(name,60)).filter(Boolean).slice(0,20) : [];
  if (!/^[a-zA-Z0-9-]{3,64}$/.test(id) || !title || !champion || !finalist || !statuses.includes(status) || !eventDate) return json({ error: 'Complete all event details.' }, 400);
  if (!Number.isInteger(championScore) || championScore<0 || championScore>99 || !Number.isInteger(finalistScore) || finalistScore<0 || finalistScore>99) return json({ error: 'Scores must be whole numbers from 0 to 99.' }, 400);
  await ensureByotHistory(env);
  await env.DB.prepare(`INSERT INTO byot_history (id,title,event_date,lifecycle_status,champion,finalist,champion_score,finalist_score,roster_json,updated_by)
    VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,event_date=excluded.event_date,
    lifecycle_status=excluded.lifecycle_status,champion=excluded.champion,finalist=excluded.finalist,champion_score=excluded.champion_score,
    finalist_score=excluded.finalist_score,roster_json=excluded.roster_json,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
    .bind(id,title,eventDate,status,champion,finalist,championScore,finalistScore,JSON.stringify(roster),String(actor.discord_id)).run();
  return json({ ok:true,id });
}
