import { getSession, json, sameOrigin } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const actor = await getSession(request, env);
  if (!actor || actor.role !== 'owner') return json({ error: 'Owner access required.' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const discordId = String(body.discordId || '');
  const role = body.role;
  if (!/^\d{15,22}$/.test(discordId) || !['member', 'admin'].includes(role)) return json({ error: 'Invalid user or role.' }, 400);
  if (discordId === String(env.OWNER_DISCORD_ID)) return json({ error: 'The configured owner cannot be demoted.' }, 400);
  const target = await env.DB.prepare('SELECT role FROM users WHERE discord_id = ?').bind(discordId).first();
  if (!target) return json({ error: 'User not found.' }, 404);
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE discord_id = ?`).bind(role, discordId),
    env.DB.prepare(`INSERT INTO audit_log (actor_discord_id, action, target_discord_id, details) VALUES (?, 'role_changed', ?, ?)`).bind(String(actor.discord_id), discordId, JSON.stringify({ from: target.role, to: role }))
  ]);
  return json({ ok: true });
}
