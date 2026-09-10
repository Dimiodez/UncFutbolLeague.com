import { json, oauthCookie, randomToken, requireConfiguration } from '../../_lib/auth.js';
import { consumeRateLimit } from '../../_lib/rate-limit.js';

export async function onRequestGet({ request, env }) {
  const requestUrl = new URL(request.url);
  if (requestUrl.hostname === 'uncfutbolleague.com') {
    requestUrl.hostname = 'www.uncfutbolleague.com';
    return Response.redirect(requestUrl.toString(), 308);
  }
  const missing = requireConfiguration(env);
  if (missing.length) return json({ error: 'Discord login is not configured yet.', missing }, 503);
  const subject = request.headers.get('cf-connecting-ip') || 'unknown';
  const rate = await consumeRateLimit(env, { scope: 'discord-login', subject, limit: 15 });
  if (!rate.success) return json({ error: 'Too many login attempts. Please wait a minute and try again.' }, 429, { 'retry-after': String(rate.retryAfter) });
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
