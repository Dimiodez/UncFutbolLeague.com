import test from 'node:test';
import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {validatePhoto,boundedBytes,playerFor,staffGuard,imageResponse} from '../functions/_lib/player-photos.js';
import {onRequestPost as upload} from '../functions/api/admin/player-photos.js';
import {onRequestGet as original} from '../functions/api/admin/player-photos/[photoId]/image.js';
import {onRequestGet as publicImage} from '../functions/api/player-portraits/[playerId].js';
import {onRequestPost as review} from '../functions/api/admin/player-photos/[photoId].js';
const database=user=>({prepare:()=>({bind:()=>({first:async()=>user})})});
const actor={discord_id:'staff',role:'admin',status:'active'};
const request=(method='GET',origin='https://site.test')=>new Request('https://site.test/api/admin/player-photos',{method,headers:{cookie:'__Host-ufl_session=sample',origin}});
const png=(w=512,h=640)=>{const b=new Uint8Array(32);b.set([137,80,78,71,13,10,26,10]);b.set([73,72,68,82],12);const v=new DataView(b.buffer);v.setUint32(16,w);v.setUint32(20,h);return new File([b],'portrait.png',{type:'image/png'});};
test('only known player IDs accepted and confirmed aliases share portrait identity',()=>{
  assert.equal(playerFor('../anywhere'),null);assert.equal(playerFor('not-a-player'),null);
  assert.equal(playerFor('toString'),null);
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

function workflowEnv(){
  const queries=[],deleted=[],stored=[],batches=[];
  const env={DB:{prepare(sql){const statement={sql,values:[],bind(...values){this.values=values;return this;},async first(){
    if(sql.includes('FROM sessions'))return actor;
    if(sql.includes('INSERT INTO rate_limits'))return {request_count:1};
    if(sql.includes('SELECT id,identity_id,status'))return {id:'submission',identity_id:'1790183123676-110',status:'pending'};
    return null;
  },async all(){
    if(sql.includes("status IN ('approved','rejected')"))return {results:[{id:'reviewed',original_key:'originals/reviewed'}]};
    if(sql.includes('SELECT object_key'))return {results:[{object_key:'portraits/retired.png'}]};
    return {results:[]};
  },async run(){queries.push({sql,values:this.values});return {success:true};}};return statement;},async batch(statements){batches.push(statements);return [];}},PLAYER_PHOTOS:{async put(key){stored.push(key);},async delete(key){deleted.push(key);}}};
  return {env,queries,deleted,stored,batches};
}
function formRequest(form){return new Request('https://site.test/api/admin/player-photos',{method:'POST',headers:{cookie:'__Host-ufl_session=sample',origin:'https://site.test'},body:form});}
test('authenticated upload stores original privately without publishing it',async()=>{
  const {env,stored,batches,queries}=workflowEnv();const form=new FormData();form.set('playerId','1790183123676-110');form.set('photo',png());
  const response=await upload({request:formRequest(form),env});assert.equal(response.status,201);
  assert.match(stored[0],/^originals\//);assert.equal(batches.length,0);assert.match(queries[0].sql,/INSERT INTO player_photo_submissions/);
});
test('approval retires the previous portrait and publishes only after storing the new PNG',async()=>{
  const {env,stored,deleted,batches}=workflowEnv();const form=new FormData();form.set('action','approve');form.set('portrait',png());
  assert.equal((await review({request:formRequest(form),env,params:{photoId:'submission'}})).status,200);
  assert.match(stored[0],/^portraits\/.+\.png$/);assert.equal(deleted.length,0);
  assert.match(batches[0][0].sql,/INSERT OR IGNORE INTO player_photo_retired_assets/);assert.match(batches[0][2].sql,/INSERT INTO player_photo_publications/);
});
test('cleanup is scoped to one player and preserves current portraits and pending uploads',async()=>{
  const {env,deleted,queries}=workflowEnv();const form=new FormData();form.set('action','cleanup');form.set('playerId','1790183123676-110');
  const response=await upload({request:formRequest(form),env});assert.equal(response.status,200);assert.equal((await response.json()).removed,2);
  assert.deepEqual(deleted,['originals/reviewed','portraits/retired.png']);assert.equal(queries.length,2);
  assert.match(queries[0].sql,/original_deleted_at/);assert.match(queries[1].sql,/DELETE FROM player_photo_retired_assets/);
});
