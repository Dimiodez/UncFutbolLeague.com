import { getSession, json } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const actor = await getSession(request, env);
  if (!actor || !['owner','admin'].includes(actor.role)) return json({ error:'Administrator access required.' },403);
  const result = await env.DB.prepare(`SELECT a.id,a.action,a.details,a.created_at AS createdAt,
    actor.display_name AS actorName,target.display_name AS targetName
    FROM audit_log a LEFT JOIN users actor ON actor.discord_id=a.actor_discord_id
    LEFT JOIN users target ON target.discord_id=a.target_discord_id ORDER BY a.id DESC LIMIT 100`).all();
  return json({ entries:result.results });
}
