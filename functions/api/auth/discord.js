import { json, oauthCookie, randomToken, requireConfiguration } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const missing = requireConfiguration(env);
  if (missing.length) return json({ error: 'Discord login is not configured yet.', missing }, 503);
  const state = randomToken();
  const callback = 'https://www.uncfutbolleague.com/api/auth/callback';
  const authorize = new URL('https://discord.com/oauth2/authorize');
  authorize.search = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: callback,
    scope: 'identify',
    state
  });
  return new Response(null, { status: 302, headers: { location: authorize.toString(), 'set-cookie': oauthCookie(state), 'cache-control': 'no-store' } });
}
