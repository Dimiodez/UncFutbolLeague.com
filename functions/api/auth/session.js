import { getSession, json, publicUser } from '../../_lib/auth.js';
import { ensureMemberTitles } from '../../_lib/member-titles.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await getSession(request, env);
    if (user && env.DB) {
      await ensureMemberTitles(env);
      const teamTitle = await env.DB.prepare('SELECT title AS teamTitle, team_name AS teamName FROM member_titles WHERE discord_id = ?').bind(String(user.discord_id)).first();
      if (teamTitle) Object.assign(user, teamTitle);
    }
    return json({ authenticated: Boolean(user), user: publicUser(user), configured: Boolean(env.DB && env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET && env.OWNER_DISCORD_ID) });
  } catch {
    return json({ authenticated: false, user: null, configured: false }, 200);
  }
}
