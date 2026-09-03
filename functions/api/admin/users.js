import { getSession, json } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const actor = await getSession(request, env);
  if (!actor || !['owner', 'admin'].includes(actor.role)) return json({ error: 'Administrator access required.' }, 403);
  const result = await env.DB.prepare(`SELECT discord_id AS id, username, display_name AS displayName, avatar_url AS avatarUrl, role, status, created_at AS createdAt, last_login_at AS lastLoginAt FROM users ORDER BY created_at DESC`).all();
  return json({ users: result.results, canManageRoles: actor.role === 'owner' });
}
