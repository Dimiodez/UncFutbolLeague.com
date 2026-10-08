import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet as callback} from '../functions/api/auth/callback.js';
import {onRequest as middleware} from '../functions/api/_middleware.js';

const state = 'a'.repeat(43);
const request = (query = `state=${state}&code=test-code`, cookie = state) => new Request(`https://www.uncfutbolleague.com/api/auth/callback?${query}`, {headers: {cookie: `__Host-ufl_oauth_state=${cookie}`}});
const environment = (count = 1) => ({DISCORD_CLIENT_ID: 'test', DISCORD_CLIENT_SECRET: 'test-secret', OWNER_DISCORD_ID: '123456789012345678', DB: {prepare() {return {bind() {return {async first() {return {request_count: count};}};}};}}});

test('callback rejects missing, malformed and mismatched state before any provider request', async () => {
  for (const req of [request('code=x'), request('state=short&code=x','short'), request(undefined,'b'.repeat(43))]) {
    assert.equal((await callback({request:req,env:environment()})).status,400);
  }
});
test('callback rejects foreign issuer and oversized codes', async () => {
  assert.equal((await callback({request:request(`state=${state}&code=x&iss=https://evil.test`),env:environment()})).status,400);
  assert.equal((await callback({request:request(`state=${state}&code=${'x'.repeat(2049)}`),env:environment()})).status,400);
});
test('denied login clears state and uses a fixed safe redirect', async () => {
  const response=await callback({request:request(`state=${state}&error=access_denied`),env:environment()});
  assert.equal(response.status,302);
  assert.equal(response.headers.get('location'),'https://www.uncfutbolleague.com/account?login=denied');
  assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
});
test('callback rate limit stops provider requests', async () => {
  assert.equal((await callback({request:request(),env:environment(16)})).status,429);
});
test('provider failures fail closed without exposing secrets and prohibit redirects', async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async (url,options) => {
      assert.equal(url,'https://discord.com/api/v10/oauth2/token');
      assert.equal(options.redirect,'error');
      assert.ok(options.signal instanceof AbortSignal);
      throw new Error('sensitive-provider-token');
    };
    const response=await callback({request:request(),env:environment()});
    assert.equal(response.status,503);
    assert.doesNotMatch(await response.text(),/sensitive-provider-token|test-secret/);
    assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
  } finally {globalThis.fetch=original;}
});
test('malformed provider profile cannot create a session', async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async url => Response.json(url.endsWith('/token') ? {access_token:'mock-access-token'} : {id:'malformed',username:'test'});
    const response=await callback({request:request(),env:environment()});
    assert.equal(response.status,503);
    assert.doesNotMatch(response.headers.get('set-cookie'),/__Host-ufl_session=/);
  } finally {globalThis.fetch=original;}
});
test('valid Discord identity still creates a hashed session and secure cookies',async()=>{
  const original=globalThis.fetch,statements=[];
  const env=environment();
  env.DB={prepare(sql){return {bind(...values){statements.push({sql,values});return this;},async first(){return {request_count:1};},async run(){return {success:true};}};},async batch(){return [];}};
  try {
    globalThis.fetch=async url=>Response.json(url.endsWith('/token')?{access_token:'mock-token'}:{id:'123456789012345678',username:'test',global_name:'Test',avatar:null});
    const response=await callback({request:request(),env});
    assert.equal(response.status,302);
    assert.equal(response.headers.get('location'),'https://www.uncfutbolleague.com/account?login=success');
    const cookies=response.headers.get('set-cookie');
    assert.match(cookies,/__Host-ufl_session=/);assert.match(cookies,/HttpOnly; Secure; SameSite=Lax/);
    assert.match(statements.find(item=>item.sql.includes('INSERT INTO sessions')).values[0],/^[a-f0-9]{64}$/);
    assert.doesNotMatch(JSON.stringify(statements),/mock-token/);
  } finally {globalThis.fetch=original;}
});
test('security headers cover oversized errors and auth responses cannot be cached',async()=>{
  let called=false;
  const response=await middleware({request:new Request('https://site.test/api/auth/callback',{headers:{'content-length':'70000'}}),next:async()=>{called=true;}});
  assert.equal(called,false);assert.equal(response.status,413);
  assert.equal(response.headers.get('x-frame-options'),'DENY');
  assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');
});
test('existing private image CSP is preserved',async()=>{
  const response=await middleware({request:new Request('https://site.test/api/image'),next:async()=>new Response('image',{headers:{'content-security-policy':"default-src 'none'; img-src 'self'; sandbox"}})});
  assert.match(response.headers.get('content-security-policy'),/img-src 'self'/);
});
