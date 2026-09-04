import { getSession, json } from '../../_lib/auth.js';
import { ensureMemberTitles } from '../../_lib/member-titles.js';

export async function onRequestGet({ request, env }) {
  const actor = await getSession(request, env);
  if (!actor || !['owner', 'admin'].includes(actor.role)) return json({ error: 'Administrator access required.' }, 403);
  await ensureMemberTitles(env);
  const result = await env.DB.prepare(`SELECT u.discord_id AS id, u.username, u.display_name AS displayName, u.avatar_url AS avatarUrl,
    u.role, u.status, u.created_at AS createdAt, u.last_login_at AS lastLoginAt,
    mt.title AS teamTitle, mt.team_name AS teamName
    FROM users u LEFT JOIN member_titles mt ON mt.discord_id = u.discord_id
    ORDER BY u.created_at DESC`).all();
  return json({ users: result.results, canManageRoles: actor.role === 'owner' });
}
