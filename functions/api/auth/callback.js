import { clearOauthCookie, json, randomToken, readCookie, requireConfiguration, sessionCookie, sha256 } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const missing = requireConfiguration(env);
  if (missing.length) return json({ error: 'Discord login is not configured yet.', missing }, 503);
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const expectedState = readCookie(request, '__Host-ufl_oauth_state');
  if (!state || !expectedState || state !== expectedState) return json({ error: 'The login request expired or could not be verified.' }, 400, { 'set-cookie': clearOauthCookie });
  const code = url.searchParams.get('code');
  if (!code) return Response.redirect(`${url.origin}/account?login=denied`, 302);

  const siteOrigin = 'https://www.uncfutbolleague.com';
  const redirectUri = `${siteOrigin}/api/auth/callback`;
  const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: redirectUri })
  });
  if (!tokenResponse.ok) return json({ error: 'Discord could not complete the login.' }, 502, { 'set-cookie': clearOauthCookie });
  const tokens = await tokenResponse.json();
  const profileResponse = await fetch('https://discord.com/api/v10/users/@me', { headers: { authorization: `Bearer ${tokens.access_token}` } });
  if (!profileResponse.ok) return json({ error: 'Discord profile lookup failed.' }, 502, { 'set-cookie': clearOauthCookie });
  const profile = await profileResponse.json();
  const isOwner = String(profile.id) === String(env.OWNER_DISCORD_ID);
  const avatar = profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128` : null;

  await env.DB.prepare(`
    INSERT INTO users (discord_id, username, display_name, avatar_url, role, last_login_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(discord_id) DO UPDATE SET
      username = excluded.username,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      role = CASE WHEN excluded.role = 'owner' THEN 'owner' ELSE users.role END,
      last_login_at = datetime('now'),
      updated_at = datetime('now')
  `).bind(String(profile.id), profile.username, profile.global_name || profile.username, avatar, isOwner ? 'owner' : 'member').run();

  const token = randomToken(48);
  const tokenHash = await sha256(token);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`),
    env.DB.prepare(`INSERT INTO sessions (id_hash, discord_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))`).bind(tokenHash, String(profile.id))
  ]);
  const headers = new Headers({ location: `${siteOrigin}/account?login=success`, 'cache-control': 'no-store' });
  headers.append('set-cookie', sessionCookie(token));
  headers.append('set-cookie', clearOauthCookie);
  return new Response(null, { status: 302, headers });
}
