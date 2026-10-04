import {onRequestGet as discordLogin} from './functions/api/auth/discord.js';
import {onRequestGet as discordCallback} from './functions/api/auth/callback.js';
import {onRequestGet as authSession} from './functions/api/auth/session.js';
import {onRequestPost as authLogout} from './functions/api/auth/logout.js';
import {sameOrigin} from './functions/_lib/auth.js';
import {previewEaApi} from './functions/_lib/preview-ea.js';
// Preview boundary: no production DB, storage, OAuth sessions, or bot bindings.
// Photos remain owned by production; this narrowly scoped GET proxy only displays them.
const LIVE_ORIGIN = 'https://www.uncfutbolleague.com';
const json = (value, status = 200) => Response.json(value, {status, headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
export default {
 async fetch(request, env) {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/api/auth/discord' && request.method === 'GET') return discordLogin({request,env});
  if (path === '/api/auth/callback' && request.method === 'GET') return discordCallback({request,env});
  if (path === '/api/auth/session' && request.method === 'GET') return authSession({request,env});
  if (path === '/api/auth/logout' && request.method === 'POST') {
   if (!sameOrigin(request)) return json({error:'Same-origin request required.'},403);
   return authLogout({request,env});
  }
  if (path.startsWith('/api/ea/')) return previewEaApi(request,env);
  if (!['GET','HEAD'].includes(request.method)) return json({error:'Changes are disabled in this read-only development preview. Live data has not been changed.'},403);
  const portrait = /^\/assets\/league\/player-[a-zA-Z0-9._-]+$/.test(path) || path === '/api/player-portraits' || /^\/api\/player-portraits\/[a-zA-Z0-9_-]+$/.test(path);
  if (portrait) {
   let upstream;
   try { upstream = await fetch(new URL(path + url.search, LIVE_ORIGIN).href, {method:request.method,redirect:'follow',signal:AbortSignal.timeout(15000)}); }
   catch (error) { console.error('Preview portrait read failed',String(error)); return json({error:'Public portrait temporarily unavailable.'},502); }
   const headers = new Headers(upstream.headers);
   headers.delete('set-cookie'); headers.set('cross-origin-resource-policy','same-origin'); headers.set('x-robots-tag','noindex, nofollow');
   return new Response(upstream.body,{status:upstream.status,headers});
  }
  if (path.startsWith('/api/') || path.startsWith('/auth/')) return json({error:'This service is disabled in the development preview. Use the cloned pages and saved snapshots; live accounts and data are not connected.'},503);
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers); headers.set('x-robots-tag','noindex, nofollow');
  return new Response(response.body,{status:response.status,headers});
 }
};
