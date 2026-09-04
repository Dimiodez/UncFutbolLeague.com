import { getSession, json, sameOrigin } from '../../_lib/auth.js';
import { ensureAdminOperations } from '../../_lib/admin-operations.js';

const allowed = actor => actor && ['owner','admin'].includes(actor.role);

export async function onRequestGet({ request, env }) {
  const actor = await getSession(request, env);
  if (!allowed(actor)) return json({ error:'Administrator access required.' },403);
  await ensureAdminOperations(env);
  const result = await env.DB.prepare(`SELECT m.id,m.message,m.created_at AS createdAt,u.display_name AS displayName,u.avatar_url AS avatarUrl,u.role
    FROM admin_messages m JOIN users u ON u.discord_id=m.actor_discord_id ORDER BY m.id DESC LIMIT 100`).all();
  return json({ messages:result.results.reverse() });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error:'Invalid request origin.' },403);
  const actor = await getSession(request, env);
  if (!allowed(actor)) return json({ error:'Administrator access required.' },403);
  await ensureAdminOperations(env);
  const body = await request.json().catch(() => null);
  const message = String(body?.message || '').trim();
  if (!message || message.length > 1000) return json({ error:'Message must be between 1 and 1,000 characters.' },400);
  await env.DB.prepare(`INSERT INTO admin_messages (actor_discord_id,message) VALUES (?,?)`).bind(String(actor.discord_id),message).run();
  return json({ ok:true });
}
