import { clearOauthCookie, json, randomToken, readCookie, requireConfiguration, sessionCookie, sha256 } from '../../_lib/auth.js';
import { consumeRateLimit } from '../../_lib/rate-limit.js';

export async function onRequestGet({ request, env }) {
  const missing = requireConfiguration(env);
  if (missing.length) return json({ error: 'Discord login is not configured yet.', missing }, 503);
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const expectedState = readCookie(request, '__Host-ufl_oauth_state');
  if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !expectedState || state !== expectedState) return json({ error: 'The login request expired or could not be verified.' }, 400, { 'set-cookie': clearOauthCookie });
  const issuer = url.searchParams.get('iss');
  if (issuer && issuer !== 'https://discord.com') return json({ error: 'Invalid login provider.' }, 400, { 'set-cookie': clearOauthCookie });
  const code = url.searchParams.get('code');
  if (!code) return new Response(null, { status: 302, headers: { location: 'https://www.uncfutbolleague.com/account?login=denied', 'cache-control': 'no-store', 'set-cookie': clearOauthCookie } });
  if (code.length > 2048 || /[\s\x00-\x1f]/.test(code)) return json({ error: 'Invalid login request.' }, 400, { 'set-cookie': clearOauthCookie });
  const rate = await consumeRateLimit(env, { scope: 'discord-callback', subject: request.headers.get('cf-connecting-ip') || 'unknown', limit: 15 });
  if (!rate.success) return json({ error: 'Too many login attempts. Please try again shortly.' }, 429, { 'retry-after': String(rate.retryAfter), 'set-cookie': clearOauthCookie });

  const siteOrigin = 'https://www.uncfutbolleague.com';
  const redirectUri = `${siteOrigin}/api/auth/callback`;
  try {
  const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: redirectUri })
  });
  if (!tokenResponse.ok) return json({ error: 'Discord could not complete the login.' }, 502, { 'set-cookie': clearOauthCookie });
  const tokens = await tokenResponse.json();
  if (typeof tokens.access_token !== 'string' || !tokens.access_token || tokens.access_token.length > 4096 || /[\r\n]/.test(tokens.access_token)) throw new Error('Invalid provider response');
  const profileResponse = await fetch('https://discord.com/api/v10/users/@me', { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { authorization: `Bearer ${tokens.access_token}` } });
  if (!profileResponse.ok) return json({ error: 'Discord profile lookup failed.' }, 502, { 'set-cookie': clearOauthCookie });
  const profile = await profileResponse.json();
  if (!/^\d{15,22}$/.test(String(profile.id || '')) || typeof profile.username !== 'string' || !profile.username || profile.username.length > 100) throw new Error('Invalid provider profile');
  if (profile.global_name != null && (typeof profile.global_name !== 'string' || profile.global_name.length > 100)) throw new Error('Invalid provider profile');
  if (profile.avatar != null && !/^(?:a_)?[a-f0-9]{32}$/.test(profile.avatar)) throw new Error('Invalid provider avatar');
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
  } catch {
    // Fail closed: never expose provider responses, auth codes or tokens.
    return json({ error: 'Login is temporarily unavailable. Please start a new Discord login shortly.' }, 503, { 'set-cookie': clearOauthCookie });
  }
}
