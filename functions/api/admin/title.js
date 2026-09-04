import { getSession, json, sameOrigin } from '../../_lib/auth.js';
import { ensureMemberTitles } from '../../_lib/member-titles.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const actor = await getSession(request, env);
  if (!actor || !['owner', 'admin'].includes(actor.role)) return json({ error: 'Administrator access required.' }, 403);
  await ensureMemberTitles(env);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const discordId = String(body.discordId || '');
  const title = String(body.title || '').toLowerCase();
  const teamName = String(body.teamName || '').trim();
  if (!/^\d{15,22}$/.test(discordId)) return json({ error: 'Invalid member.' }, 400);
  const target = await env.DB.prepare('SELECT discord_id FROM users WHERE discord_id = ?').bind(discordId).first();
  if (!target) return json({ error: 'Member not found.' }, 404);

  if (!title) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM member_titles WHERE discord_id = ?').bind(discordId),
      env.DB.prepare(`INSERT INTO audit_log (actor_discord_id, action, target_discord_id, details) VALUES (?, 'team_title_removed', ?, ?)`).bind(String(actor.discord_id), discordId, JSON.stringify({}))
    ]);
    return json({ ok: true });
  }
  if (!['captain', 'manager'].includes(title) || !teamName || teamName.length > 100) return json({ error: 'Choose a valid title and team.' }, 400);

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO member_titles (discord_id, title, team_name, assigned_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(discord_id) DO UPDATE SET title=excluded.title, team_name=excluded.team_name,
        assigned_by=excluded.assigned_by, updated_at=CURRENT_TIMESTAMP`).bind(discordId, title, teamName, String(actor.discord_id)),
    env.DB.prepare(`INSERT INTO audit_log (actor_discord_id, action, target_discord_id, details) VALUES (?, 'team_title_assigned', ?, ?)`).bind(String(actor.discord_id), discordId, JSON.stringify({ title, teamName }))
  ]);
  return json({ ok: true, title, teamName });
}
