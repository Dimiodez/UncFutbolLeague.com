import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {File} from 'node:buffer';
import {DatabaseSync} from 'node:sqlite';
import {canManageTeam,canSubmitPlayer,mediaTeam} from '../functions/_lib/team-media.js';
import {onRequestPost as manage,onRequestGet as access} from '../functions/api/team-media/manage.js';
import {onRequestPost as submit,onRequestGet as submissions} from '../functions/api/admin/player-photos.js';
import {onRequestPost as review} from '../functions/api/admin/player-photos/[photoId].js';
import {onRequestGet as original} from '../functions/api/admin/player-photos/[photoId]/image.js';
import {onRequestGet as image} from '../functions/api/team-media/images/[assetId].js';
const id='123456789012345678',player='1790183123676-110';
const png=()=>{const bytes=new Uint8Array(32);bytes.set([137,80,78,71,13,10,26,10]);bytes.set([73,72,68,82],12);const view=new DataView(bytes.buffer);view.setUint32(16,512);view.setUint32(20,640);return new File([bytes],'photo.png',{type:'image/png'});};
function setup(role='member'){
 const state={role,granted:true,membership:true,published:false,stored:[],queries:[],batches:[],deleted:[]};
 const env={DB:{prepare(sql){return {bind(...values){this.values=values;return this;},async first(){
  state.queries.push({sql,values:this.values});
  if(sql.includes('FROM sessions'))return state.role?{discord_id:id,role:state.role,status:'active'}:null;
  if(sql.includes('INSERT INTO rate_limits'))return {request_count:1};
  if(sql.includes('FROM team_media_managers'))return state.granted&&this.values[1]==='6v6'&&this.values[2]==='ROM'?{allowed:1}:null;
  if(sql.includes('JOIN team_media_managers'))return state.granted&&state.membership&&this.values[0]===player?{allowed:1}:null;
  if(sql.includes('FROM users'))return {discord_id:id};
  if(sql.includes('FROM team_media_publications p JOIN team_media_assets'))return state.previous||null;
  if(sql.includes('SELECT 1 AS current'))return state.previousStillCurrent?{current:1}:null;
  if(sql.includes('FROM team_media_assets'))return state.published?{object_key:'team-media/test',content_type:'image/png'}:null;
  return null;
 },async all(){return {results:[{id:'submission',status:'pending',original_deleted_at:null}]};},async run(){state.queries.push({sql,values:this.values});return {success:true};},sql};},async batch(statements){state.batches.push(statements);return [];}},PLAYER_PHOTOS:{async put(key){state.stored.push(key);},async get(key){state.stored.push(key);return {body:new Uint8Array([1])};},async delete(key){state.deleted.push(key);}}};
 return {env,state,actor:{discord_id:id,role}};
}
const request=(form,origin='https://site.test')=>new Request('https://site.test/api/team-media/manage?division=6v6&team=ROM',{method:form?'POST':'GET',headers:{cookie:'__Host-ufl_session=test',origin},...(form?{body:form}:{})});
function uploadForm(team='ROM',division='6v6') {const form=new FormData();form.set('action','upload');form.set('division',division);form.set('team',team);form.set('kind','logo');form.set('photo',png());return form;}

test('image manager grants are exact division/team scopes and never name matches',async()=>{
 const {env,actor,state}=setup();
 assert.equal(mediaTeam('6v6','ROM'),true);assert.equal(mediaTeam('6v6','../ROM'),false);
 assert.equal(await canManageTeam(env,actor,'6v6','ROM'),true);
 assert.equal(await canManageTeam(env,actor,'10v10','TFC'),false);
 assert.equal(await canManageTeam(env,actor,'6v6','LA'),false);
 assert.equal(await canManageTeam(env,{...actor,role:'admin'},'10v10','TFC'),true);
 assert.equal(await canSubmitPlayer(env,actor,player),true);
 state.membership=false;assert.equal(await canSubmitPlayer(env,actor,player),false,'released players lose manager access');
 state.granted=false;assert.equal(await canManageTeam(env,actor,'6v6','ROM'),false,'revocation is read fresh');
});
test('signed out, unassigned, other-team and cross-origin uploads never touch image storage',async()=>{
 for(const [role,grant,form,origin] of [[null,true,uploadForm(),'https://site.test'],['member',false,uploadForm(),'https://site.test'],['member',true,uploadForm('LA'),'https://site.test'],['admin',true,uploadForm(),'https://evil.test']]){
  const {env,state}=setup(role);state.granted=grant;
  assert.equal((await manage({request:request(form,origin),env})).status,403);assert.equal(state.stored.length,0);
 }
});
test('manager publishes only a validated club logo/stadium, with audited immutable storage',async()=>{
 const {env,state}=setup();
 const response=await manage({request:request(uploadForm()),env});assert.equal(response.status,201);
 assert.match(state.stored[0],/^team-media\//);assert.equal(state.batches.length,1);
 assert.match(state.batches[0][1].sql,/team_media_publications/);assert.match(state.batches[0][2].sql,/audit_log/);
 const bad=uploadForm();bad.set('photo',new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'}));
 assert.equal((await manage({request:request(bad),env})).status,400);assert.equal(state.stored.length,1);
});
test('managers cannot grant or revoke permissions; staff can grant active members',async()=>{
 const form=uploadForm();form.set('action','grant');form.set('discordId',id);
 const manager=setup();assert.equal((await manage({request:request(form),env:manager.env})).status,403);assert.equal(manager.state.batches.length,0);
 const staff=setup('admin');assert.equal((await manage({request:request(form),env:staff.env})).status,200);assert.match(staff.state.batches[0][0].sql,/INSERT INTO team_media_managers/);
});
test('replacement cleanup deletes only unused previous club assets after a successful commit',async()=>{
 const {env,state}=setup();state.previous={id:'old',object_key:'team-media/old'};
 assert.equal((await manage({request:request(uploadForm()),env})).status,201);
 assert.deepEqual(state.deleted,['team-media/old']);assert.ok(!state.deleted.includes(state.stored[0]));
 const protectedAsset=setup();protectedAsset.state.previous=state.previous;protectedAsset.state.previousStillCurrent=true;
 assert.equal((await manage({request:request(uploadForm()),env:protectedAsset.env})).status,201);assert.equal(protectedAsset.state.deleted.length,0);
 const failed=setup();failed.state.previous=state.previous;failed.env.DB.batch=async()=>{throw new Error('DB unavailable');};
 await assert.rejects(manage({request:request(uploadForm()),env:failed.env}),/DB unavailable/);
 assert.deepEqual(failed.state.deleted,[failed.state.stored[0]]);assert.ok(!failed.state.deleted.includes('team-media/old'));
});
test('managers submit portraits privately but cannot approve, reject, clean up or read originals',async()=>{
 const {env,state}=setup();const form=new FormData();form.set('playerId',player);form.set('photo',png());
 assert.equal((await submit({request:request(form),env})).status,201);assert.match(state.stored[0],/^originals\//);assert.equal(state.batches.length,0);
 const listing=await submissions({request:new Request(`https://site.test/api/admin/player-photos?playerId=${player}`,{headers:{cookie:'__Host-ufl_session=test'}}),env});
 const data=await listing.json();assert.equal(data.canReview,false);assert.equal(data.photos[0].originalUrl,null);
 for(const action of ['approve','reject']){form.set('action',action);assert.equal((await review({request:request(form),env,params:{photoId:'submission'}})).status,403);}
 form.set('action','cleanup');assert.equal((await submit({request:request(form),env})).status,403);
 assert.equal((await original({request:request(),env,params:{photoId:'submission'}})).status,403);
 assert.equal(state.deleted.length,0);assert.equal(state.batches.length,0);
 state.membership=false;assert.equal((await submit({request:request(form),env})).status,403);
});
test('only current published club assets are public, never retired images or originals',async()=>{
 const {env,state}=setup();const params={assetId:'12345678-1234-1234-1234-123456789abc'};
 assert.equal((await image({env,params})).status,404);assert.equal(state.stored.length,0);
 state.published=true;const response=await image({env,params});assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/sandbox/);
 assert.deepEqual(state.stored,['team-media/test']);
});
test('UI exposes separate manager submission and staff review paths, and stable scoped controls',()=>{
 const source=fs.readFileSync(new URL('../player-photo-review.js',import.meta.url),'utf8');
 assert.match(source,/if\(!access.canReview\)/);assert.match(source,/Submit for approval/);assert.match(source,/Upload & publish/);assert.match(source,/access.canManageManagers/);
});

test('real SQLite migration and roster join preserve explicit division boundaries',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(`PRAGMA foreign_keys=ON;
   CREATE TABLE users(discord_id TEXT PRIMARY KEY);
   CREATE TABLE member_titles(discord_id TEXT,title TEXT,team_name TEXT,assigned_by TEXT);
   CREATE TABLE league_roster_memberships(player_id TEXT,season TEXT,division TEXT,team_key TEXT);
   INSERT INTO users VALUES('owner'),('roma-manager'),('ordinary');
   INSERT INTO member_titles VALUES('roma-manager','manager','UFL Roma','owner');
   INSERT INTO league_roster_memberships VALUES('player-a','2','6v6','ROM'),('player-b','2','10v10','ROM'),('player-c','1','6v6','ROM');`);
  db.exec(fs.readFileSync(new URL('../migrations/0018_team_media.sql',import.meta.url),'utf8'));
  const env={DB:{prepare(sql){return {bind(...values){return {first:async()=>db.prepare(sql).get(...values)||null};}};}}};
  const actor={discord_id:'roma-manager',role:'member'};
  assert.equal(await canManageTeam(env,actor,'6v6','ROM'),true);
  assert.equal(await canSubmitPlayer(env,actor,'player-a'),true);
  assert.equal(await canSubmitPlayer(env,actor,'player-b'),false);
  assert.equal(await canSubmitPlayer(env,actor,'player-c'),false);
  db.exec("UPDATE league_roster_memberships SET team_key=NULL WHERE player_id='player-a'");
  assert.equal(await canSubmitPlayer(env,actor,'player-a'),false);
  db.exec("DELETE FROM team_media_managers WHERE discord_id='roma-manager'");
  assert.equal(await canManageTeam(env,actor,'6v6','ROM'),false);
 }finally{db.close();}
});
