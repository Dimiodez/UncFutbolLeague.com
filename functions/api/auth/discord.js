import { json, oauthCookie, randomToken, requireConfiguration, sameOrigin } from '../../_lib/auth.js';
import { consumeRateLimit } from '../../_lib/rate-limit.js';
import { LOGIN_HOSTS, loginChallenge, signLoginState, turnstileToken, verifyTurnstile } from '../../_lib/turnstile.js';

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
  if (!LOGIN_HOSTS.includes(requestUrl.hostname)) return json({error:'Use the official UFL website to sign in.'},403);
  return loginChallenge(env);
}

export async function onRequestPost({ request, env }) {
  const hostname=new URL(request.url).hostname;
  if (!sameOrigin(request) || hostname !== 'www.uncfutbolleague.com') return json({error:'Invalid request origin. Start login from the official UFL website.'},403);
  if (requireConfiguration(env).length || !env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY) return json({error:'Secure login is temporarily unavailable.'},503);
  const rate=await consumeRateLimit(env,{scope:'discord-verify',subject:request.headers.get('cf-connecting-ip') || 'unknown',limit:15});
  if(!rate.success) return json({error:'Too many login attempts. Please wait a minute and try again.'},429,{'retry-after':String(rate.retryAfter)});
  const token=await turnstileToken(request);
  if(!await verifyTurnstile(token,env,hostname)) return loginChallenge(env,'Human verification failed or expired. Please complete the check again.',403);
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
  return json({authorizeUrl:authorize.toString()},200,{'set-cookie':oauthCookie(await signLoginState(state,env))});
}
