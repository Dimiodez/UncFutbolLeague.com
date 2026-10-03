import test from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {validatePhoto,boundedBytes,playerFor,staffGuard,imageResponse} from '../functions/_lib/player-photos.js';
import {onRequestPost as upload} from '../functions/api/admin/player-photos.js';
import {onRequestGet as original} from '../functions/api/admin/player-photos/[photoId]/image.js';
import {onRequestGet as publicImage} from '../functions/api/player-portraits/[playerId].js';
const database=user=>({prepare:()=>({bind:()=>({first:async()=>user})})});
const actor={discord_id:'staff',role:'admin',status:'active'};
const request=(method='GET',origin='https://site.test')=>new Request('https://site.test/api/admin/player-photos',{method,headers:{cookie:'__Host-ufl_session=sample',origin}});
const png=(w=512,h=640)=>{const b=new Uint8Array(32);b.set([137,80,78,71,13,10,26,10]);b.set([73,72,68,82],12);const v=new DataView(b.buffer);v.setUint32(16,w);v.setUint32(20,h);return new File([b],'portrait.png',{type:'image/png'});};
test('only known player IDs accepted and confirmed aliases share portrait identity',()=>{
  assert.equal(playerFor('../anywhere'),null);assert.equal(playerFor('not-a-player'),null);
  assert.equal(playerFor('1790183123676-110').identity,playerFor('1790179840025').identity);
});
test('staff guard blocks ordinary members and cross-origin writes',async()=>{
  const env={DB:database({...actor,role:'member'}),PLAYER_PHOTOS:{}};
  assert.equal((await staffGuard(request(),env)).response.status,403);
  assert.equal((await staffGuard(request('POST','https://evil.test'),{...env,DB:database(actor)},true)).response.status,403);
});
test('missing storage is reported without making photo changes',async()=>{
  assert.equal((await staffGuard(request(),{DB:database(actor)})).response.status,503);
});
test('signed-out visitors cannot upload or retrieve private originals',async()=>{
  const env={DB:database(null),PLAYER_PHOTOS:{get(){throw new Error('Must not touch storage');}}};
  assert.equal((await upload({request:request('POST'),env})).status,403);
  assert.equal((await original({request:request(),env,params:{photoId:'sample'}})).status,403);
});
test('image validation rejects SVG, spoofed MIME, oversized images and incorrect portrait dimensions',async()=>{
  await assert.rejects(validatePhoto(new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'})),/Unsupported/);
  await assert.rejects(validatePhoto(new File(['not png'],'bad.png',{type:'image/png'})),/Unsupported/);
  await assert.rejects(validatePhoto(png(100,100),true),/512/);
  await assert.rejects(validatePhoto(new File([new Uint8Array(5*1024*1024+1)],'big.png',{type:'image/png'})),/5 MB/);
  assert.equal((await validatePhoto(png(),true)).type,'image/png');
});
test('body reader enforces a hard limit even without Content-Length',async()=>{
  await assert.rejects(boundedBytes(new Request('https://site.test',{method:'POST',body:'12345'}),4),/limit/);
});
test('public portrait endpoint never falls back to private original',async()=>{
  let touched=false;const env={DB:database(null),PLAYER_PHOTOS:{get(){touched=true;}}};
  assert.equal((await publicImage({env,params:{playerId:'1790183123676-110'}})).status,404);assert.equal(touched,false);
});
test('private originals use no-store and sandboxed image responses',()=>{
  const response=imageResponse({body:new Uint8Array([1])},'image/png');
  assert.equal(response.headers.get('cache-control'),'private, no-store');assert.match(response.headers.get('content-security-policy'),/sandbox/);
});
