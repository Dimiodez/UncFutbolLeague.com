import { json } from '../_lib/auth.js';
import { ensureMemberTitles,memberTeamTitles } from '../_lib/member-titles.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ users: [] });
  await ensureMemberTitles(env);
  const result = await env.DB.prepare(`SELECT u.discord_id AS titleUserId, u.display_name AS displayName, u.avatar_url AS avatarUrl, u.role,
    mt.title AS teamTitle, mt.team_name AS teamName
    FROM users u LEFT JOIN member_titles mt ON mt.discord_id = u.discord_id
    WHERE u.status = 'active'
    ORDER BY CASE u.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.display_name COLLATE NOCASE`).all();
  const titles=await memberTeamTitles(env);
  const users=result.results.map(({titleUserId,...user})=>({...user,teamTitles:titles.filter(t=>t.userId===titleUserId).map(({userId,...title})=>title)}));
  return json({ users }, 200, { 'cache-control': 'public, max-age=60' });
}
