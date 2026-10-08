import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {onRequestGet,onRequestPost} from '../functions/api/auth/discord.js';
import {loginChallenge,signLoginState,verifyLoginState,verifyTurnstile,turnstileToken} from '../functions/_lib/turnstile.js';

const host='www.uncfutbolleague.com',origin=`https://${host}`;
const environment=(count=1)=>({DISCORD_CLIENT_ID:'test-client',DISCORD_CLIENT_SECRET:'test-discord-secret',OWNER_DISCORD_ID:'123456789012345678',TURNSTILE_SITE_KEY:'site-key-for-testing',TURNSTILE_SECRET_KEY:'test-turnstile-secret',DB:{prepare(){return {bind(){return {async first(){return {request_count:count};}};}};}}});
const request=(token='test-token',requestOrigin=origin)=>new Request(`${origin}/api/auth/discord`,{method:'POST',headers:{origin:requestOrigin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({'cf-turnstile-response':token})});

test('GET displays the human check without issuing an OAuth cookie or redirect',async()=>{
  const response=await onRequestGet({request:new Request(`${origin}/api/auth/discord`),env:environment()});
  assert.equal(response.status,200);assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('set-cookie'),null);
  const html=await response.text();assert.match(html,/id="human-check"/);assert.match(html,/method="post"/);assert.match(html,/disabled/);
  assert.doesNotMatch(html,/test-turnstile-secret|test-discord-secret/);
  assert.match(response.headers.get('content-security-policy'),/frame-src https:\/\/challenges.cloudflare.com/);
});
test('missing widget configuration fails closed',async()=>{
  const env=environment();delete env.TURNSTILE_SECRET_KEY;
  assert.equal(loginChallenge(env).status,503);
  assert.equal((await onRequestPost({request:request(),env})).status,503);
});
test('apex links redirect to the canonical host; preview hosts cannot log in',async()=>{
  assert.equal((await onRequestGet({request:new Request('https://uncfutbolleague.com/api/auth/discord'),env:environment()})).headers.get('location'),`${origin}/api/auth/discord`);
  assert.equal((await onRequestGet({request:new Request('https://preview.pages.dev/api/auth/discord'),env:environment()})).status,403);
});
test('cross-origin and direct tokenless POSTs cannot start OAuth',async()=>{
  assert.equal((await onRequestPost({request:request('x','https://evil.test'),env:environment()})).status,403);
  const response=await onRequestPost({request:request(''),env:environment()});
  assert.equal(response.status,403);assert.equal(response.headers.get('location'),null);
  assert.equal(response.headers.get('set-cookie'),null);
});
test('form reader rejects oversized, duplicate and JSON tokens',async()=>{
  assert.equal(await turnstileToken(request('x'.repeat(2049))),null);
  assert.equal(await turnstileToken(new Request(origin,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'cf-turnstile-response=x&cf-turnstile-response=y'})),null);
  assert.equal(await turnstileToken(new Request(origin,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})),null);
  assert.equal(await turnstileToken(request('x'.repeat(9000))),null);
});
test('failed, replayed, wrong-host and wrong-action tokens are rejected server-side',async()=>{
  const original=globalThis.fetch;
  try{
    for(const result of [{success:false,'error-codes':['timeout-or-duplicate']},{success:true,hostname:'evil.test',action:'discord-login'},{success:true,hostname:host,action:'other'},{success:'true',hostname:host,action:'discord-login'}]){
      globalThis.fetch=async()=>Response.json(result);
      assert.equal(await verifyTurnstile('test-token',environment(),host),false);
      assert.equal((await onRequestPost({request:request(),env:environment()})).status,403);
    }
    globalThis.fetch=async()=>{throw new Error('sensitive-network-detail');};
    const response=await onRequestPost({request:request(),env:environment()});
    assert.equal(response.status,403);assert.doesNotMatch(await response.text(),/sensitive-network-detail/);
  }finally{globalThis.fetch=original;}
});
test('only server-verified tokens issue signed state and redirect to official Discord',async()=>{
  const original=globalThis.fetch;
  try{
    globalThis.fetch=async(url,options)=>{
      assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(options.redirect,'error');
      assert.equal(options.body.get('secret'),'test-turnstile-secret');
      return Response.json({success:true,hostname:host,action:'discord-login'});
    };
    const response=await onRequestPost({request:request(),env:environment()});
    assert.equal(response.status,303);
    const redirect=new URL(response.headers.get('location'));assert.equal(redirect.origin,'https://discord.com');
    assert.equal(redirect.searchParams.get('scope'),'identify');
    const cookie=decodeURIComponent(response.headers.get('set-cookie').split(';')[0].split('=')[1]);
    assert.equal(await verifyLoginState(cookie,redirect.searchParams.get('state'),environment()),true);
    assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  }finally{globalThis.fetch=original;}
});
test('signed state cannot be forged, reused with other state, or used beyond ten minutes',async()=>{
  const env=environment(),state='a'.repeat(43),cookie=await signLoginState(state,env);
  assert.equal(await verifyLoginState(cookie,state,env),true);
  assert.equal(await verifyLoginState(state,state,env),false);
  assert.equal(await verifyLoginState(cookie,'b'.repeat(43),env),false);
  assert.equal(await verifyLoginState(cookie,state,{TURNSTILE_SECRET_KEY:'wrong'}),false);
  for(const seconds of [-601,60]){
    const payload=`${state}.${Math.floor(Date.now()/1000)+seconds}`;
    const invalid=`${payload}.${createHmac('sha256',env.TURNSTILE_SECRET_KEY).update(payload).digest('hex')}`;
    assert.equal(await verifyLoginState(invalid,state,env),false);
  }
});
test('verification rate limit prevents provider requests',async()=>{
  assert.equal((await onRequestPost({request:request(),env:environment(16)})).status,429);
});
