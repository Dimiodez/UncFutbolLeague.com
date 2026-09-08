import { json } from '../_lib/auth.js';
import { ensureMemberTitles } from '../_lib/member-titles.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ users: [] });
  await ensureMemberTitles(env);
  const result = await env.DB.prepare(`SELECT u.display_name AS displayName, u.avatar_url AS avatarUrl, u.role,
    mt.title AS teamTitle, mt.team_name AS teamName
    FROM users u LEFT JOIN member_titles mt ON mt.discord_id = u.discord_id
    WHERE u.status = 'active'
    ORDER BY CASE u.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.display_name COLLATE NOCASE`).all();
  return json({ users: result.results }, 200, { 'cache-control': 'public, max-age=60' });
}
