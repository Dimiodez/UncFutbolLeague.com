import {json} from './auth.js';

export const LOGIN_HOSTS = ['uncfutbolleague.com', 'www.uncfutbolleague.com'];
export const LOGIN_ACTION = 'discord-login';

const encoder=new TextEncoder();
async function stateKey(env){
  if(!env.TURNSTILE_SECRET_KEY)throw new Error('Login verification key unavailable');
  return crypto.subtle.importKey('raw',encoder.encode(env.TURNSTILE_SECRET_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function signLoginState(state,env){
  const payload=`${state}.${Math.floor(Date.now()/1000)}`;
  const signature=await crypto.subtle.sign('HMAC',await stateKey(env),encoder.encode(payload));
  const hex=[...new Uint8Array(signature)].map(b=>b.toString(16).padStart(2,'0')).join('');
  return `${payload}.${hex}`;
}
export async function verifyLoginState(cookie,state,env){
  try{
    const [saved,issued,signature,...extra]=cookie.split('.');
    if(extra.length||saved!==state||!/^\d{10}$/.test(issued)||! /^[a-f0-9]{64}$/.test(signature))return false;
    const age=Math.floor(Date.now()/1000)-Number(issued);
    if(age<0||age>600)return false;
    return crypto.subtle.verify('HMAC',await stateKey(env),Uint8Array.from(signature.match(/../g),b=>parseInt(b,16)),encoder.encode(`${saved}.${issued}`));
  }catch{return false;}
}

export function loginChallenge(env, message = '', status = 200) {
  const sitekey = env.TURNSTILE_SITE_KEY || '';
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(sitekey) || !env.TURNSTILE_SECRET_KEY) {
    return json({error:'Human verification is temporarily unavailable. Please try again shortly.'},503);
  }
  // Only fixed, internal error messages may be passed here; never interpolate request values.
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Secure sign in | UNC Futbol League</title><link rel="stylesheet" href="/auth-turnstile.css"><script src="/auth-turnstile.js?v=20261008-turnstile-2" defer></script><script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script></head><body><main><a class="brand" href="/" aria-label="UNC Futbol League home"><span>UFL</span> UNC FUTBOL LEAGUE</a><p class="eyebrow">SECURE SIGN IN</p><h1>Join with Discord</h1><p>A quick human check helps protect our league from automated login attempts.</p><p>Next, you’ll sign in on Discord’s official website. UFL never asks for your Discord password.</p>${message ? `<p class="notice" role="alert">${message}</p>` : ''}<form method="post" action="/api/auth/discord" id="login-form"><div id="human-check" data-sitekey="${sitekey}"></div><p id="verification-status" role="status" aria-live="polite">Loading human verification…</p><button type="submit" id="discord-continue" disabled>Continue with Discord →</button></form><noscript><p>JavaScript is needed for human verification. Enable it and reload this page.</p></noscript><p class="privacy">We request only your Discord identity and avatar—not your email or messages. <a href="/privacy">Privacy notice</a></p><a class="back" href="/account">Back to account</a></main></body></html>`;
  return new Response(html,{status,headers:{
    'content-type':'text/html; charset=utf-8','cache-control':'private, no-store',
    'content-security-policy':"default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://discord.com"
  }});
}

export async function turnstileToken(request) {
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/x-www-form-urlencoded')) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks=[];let size=0;
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();return null;}chunks.push(value);}
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const values = new URLSearchParams(new TextDecoder().decode(bytes)).getAll('cf-turnstile-response');
  if(values.length!==1 || !values[0] || values[0].length>2048) return null;
  return values[0];
}

export async function verifyTurnstile(token, env, hostname) {
  if (!token || !env.TURNSTILE_SECRET_KEY || !LOGIN_HOSTS.includes(hostname)) return false;
  try {
    const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
      headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token})
    });
    if(!response.ok){console.warn('UFL Turnstile verification unavailable',response.status);return false;}
    const result=await response.json();
    const valid=result.success===true && result.hostname===hostname && result.action===LOGIN_ACTION;
    if(!valid)console.warn('UFL Turnstile verification rejected',JSON.stringify({codes:result['error-codes']||[],hostnameMatches:result.hostname===hostname,actionMatches:result.action===LOGIN_ACTION}));
    return valid;
  } catch {console.warn('UFL Turnstile verification unavailable');return false;}
}
