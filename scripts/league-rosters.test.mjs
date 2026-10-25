import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestPost as write,onRequestGet as adminRead} from '../functions/api/admin/players.js';
import {rosterSnapshot,discordName} from '../functions/_lib/league-rosters.js';
import {resolvePhotoPlayer} from '../functions/_lib/player-photos.js';
import {ROSTER_CLUBS} from '../functions/_lib/roster-clubs.js';
import {onRequestPost as publishPhoto} from '../functions/api/admin/player-photos/publish.js';
import {onRequestGet as portraitList} from '../functions/api/player-portraits.js';
import {onRequestGet as portraitImage} from '../functions/api/player-portraits/[playerId].js';
import {File} from 'node:buffer';
function fixture(role='admin'){
 const db=new DatabaseSync(':memory:');db.exec(`PRAGMA foreign_keys=ON;CREATE TABLE users(discord_id TEXT PRIMARY KEY);INSERT INTO users VALUES('staff');CREATE TABLE audit_log(actor_discord_id TEXT REFERENCES users(discord_id),action TEXT,details TEXT);`);
 const seed=readFileSync(new URL('../migrations/0012_league_rosters.sql',import.meta.url),'utf8');db.exec(seed);
 db.exec(readFileSync(new URL('../migrations/0011_player_photos.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('../migrations/0013_player_merges.sql',import.meta.url),'utf8'));
 const actor=role?{discord_id:'staff',role,status:'active'}:null;
 const env={DB:{prepare(sql){let values=[];return {bind(...args){values=args;return this;},async first(){if(sql.includes('FROM sessions'))return actor;if(sql.includes('INSERT INTO rate_limits'))return {request_count:1};return db.prepare(sql).get(...values)||null;},async all(){return {results:db.prepare(sql).all(...values)};},async run(){const result=db.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}};}};},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}}};
 return {env,db};
}
function request(body,origin='https://site.test'){return new Request('https://site.test/api/admin/players',{method:'POST',headers:{cookie:'__Host-ufl_session=sample',origin,'content-type':'application/json'},body:JSON.stringify(body)});}
test('only staff can manage rosters; cross-origin writes are denied',async()=>{
 for(const role of [null,'member']){const {env,db}=fixture(role);assert.equal((await write({request:request({action:'create',discordName:'test-user'}),env})).status,403);assert.equal((await adminRead({request:new Request('https://site.test',{headers:{cookie:'__Host-ufl_session=sample'}}),env})).status,403);db.close();}
 const {env,db}=fixture();assert.equal((await write({request:request({action:'create',discordName:'test-user'},'https://evil.test'),env})).status,403);db.close();
});
test('add by Discord name persists in pool, blocks duplicate names and supports photos',async()=>{
 const {env,db}=fixture();const response=await write({request:request({action:'create',discordName:' @NewPlayer '}),env});assert.equal(response.status,201);const {id}=await response.json();
 assert.equal((await write({request:request({action:'create',discordName:'newplayer'}),env})).status,409);
 const snapshot=await rosterSnapshot(env);for(const division of ['6v6','10v10'])assert.equal(snapshot.players[division].find(p=>p.id===id).club,null);
 assert.equal((await resolvePhotoPlayer(env,id)).identity,id);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n,1);db.close();
});
test('assignments replace only the selected division; release keeps the player and profile ID',async()=>{
 const {env,db}=fixture(),playerId='1790183123676-110',six=ROSTER_CLUBS['6v6'][0].key,ten=ROSTER_CLUBS['10v10'][0].key;
 const assign=(division,team,season='2')=>write({request:request({action:'assign',playerId,division,team,season}),env});
 const before=db.prepare("SELECT profile_id FROM league_roster_memberships WHERE player_id=? AND division='10v10'").get(playerId).profile_id;
 assert.equal((await assign('6v6',six)).status,200);assert.equal((await assign('10v10',ten)).status,200);assert.equal((await assign('6v6',null)).status,200);
 const snapshot=await rosterSnapshot(env);assert.equal(snapshot.players['6v6'].find(p=>p.identity===playerId).club,null);const tenPlayer=snapshot.players['10v10'].find(p=>p.identity===playerId);assert.equal(tenPlayer.club,ten);assert.equal(tenPlayer.id,before);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM league_roster_memberships WHERE player_id=?').get(playerId).n,2);
 assert.equal((await assign('6v6','not-a-club')).status,400);assert.equal((await assign('6v6',six,'1')).status,400);db.close();
});
test('seed rerun never overwrites staff assignments or current player identities',async()=>{
 const {env,db}=fixture(),id='1790183123676-110';await write({request:request({action:'assign',playerId:id,division:'6v6',season:'2',team:null}),env});
 db.exec(readFileSync(new URL('../migrations/0012_league_rosters.sql',import.meta.url),'utf8'));assert.equal(db.prepare("SELECT team_key FROM league_roster_memberships WHERE player_id=? AND division='6v6'").get(id).team_key,null);db.close();
});
test('invalid names and malformed payloads do not modify records',async()=>{
 assert.throws(()=>discordName('\n\u0000'));assert.throws(()=>discordName('x'.repeat(81)));const {env,db}=fixture();assert.equal((await write({request:request(null),env})).status,400);db.close();
});

test('confirmed duplicates merge both divisions, keep legacy IDs, and preserve photo identity',async()=>{
 const {env,db}=fixture(),keepId='1790190860064-579',sourceId='1790122602942';
 db.prepare("INSERT INTO player_photo_submissions(id,player_id,identity_id,original_key,original_type,uploaded_by) VALUES('photo',?,?, 'originals/photo','image/png','staff')").run(sourceId,sourceId);
 db.prepare("INSERT INTO player_photo_publications(identity_id,submission_id,portrait_key,approved_by) VALUES(?,'photo','portraits/photo.png','staff')").run(sourceId);
 const response=await write({request:request({action:'merge',keepId,sourceId}),env});assert.equal(response.status,200);
 const snapshot=await rosterSnapshot(env),matches=snapshot.people.filter(p=>p.name==='Hockey Soon');assert.equal(matches.length,1);assert.equal(matches[0].memberships['6v6'].team,'club-1790182556439');assert.equal(matches[0].memberships['10v10'].team,'PALA');assert.equal(matches[0].memberships['10v10'].profileId,sourceId);
 assert.equal((await resolvePhotoPlayer(env,sourceId)).identity,keepId);assert.equal(db.prepare("SELECT identity_id FROM player_photo_submissions WHERE id='photo'").get().identity_id,keepId);assert.equal(db.prepare('SELECT portrait_key FROM player_photo_publications WHERE identity_id=?').get(keepId).portrait_key,'portraits/photo.png');assert.ok(db.prepare('SELECT backup_json FROM league_player_aliases WHERE alias_id=?').get(sourceId).backup_json);
 assert.equal((await write({request:request({action:'merge',keepId,sourceId}),env})).status,400);
 assert.equal((await write({request:request({action:'assign',playerId:sourceId,season:'2',division:'6v6',team:null}),env})).status,404);db.close();
});
test('merge refuses different players and conflicting team assignments or approved portraits',async()=>{
 const {env,db}=fixture(),keepId='1790190860064-579',sourceId='1790122602942';
 assert.equal((await write({request:request({action:'merge',keepId,sourceId:'1790183123676-110'}),env})).status,400);
 db.prepare("INSERT INTO league_roster_memberships(player_id,season,division,profile_id,team_key) VALUES(?,'2','6v6',?,'ROM')").run(sourceId,sourceId);
 assert.equal((await write({request:request({action:'merge',keepId,sourceId}),env})).status,409);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM league_player_aliases').get().n,0);
 db.prepare("UPDATE league_roster_memberships SET team_key=NULL WHERE player_id=? AND division='6v6'").run(sourceId);
 for(const [index,id] of [keepId,sourceId].entries()){db.prepare('INSERT INTO player_photo_submissions(id,player_id,identity_id,original_key,original_type,uploaded_by) VALUES(?,?,?,?,?,?)').run('photo'+index,id,id,'originals/'+index,'image/png','staff');db.prepare('INSERT INTO player_photo_publications(identity_id,submission_id,portrait_key,approved_by) VALUES(?,?,?,?)').run(id,'photo'+index,'portraits/'+index,'staff');}
 assert.equal((await write({request:request({action:'merge',keepId,sourceId}),env})).status,409);db.close();
});

function photoFixture(role='admin'){
 const result=fixture(role),objects=new Map(),deleted=[];
 result.env.PLAYER_PHOTOS={async put(key,bytes){objects.set(key,bytes);},async get(key){return objects.has(key)?{body:objects.get(key)}:null;},async delete(key){deleted.push(key);objects.delete(key);}};
 return {...result,objects,deleted};
}
function photoFile(width=512,height=640,bytes=32){
 const data=new Uint8Array(bytes);data.set([137,80,78,71,13,10,26,10]);data.set([73,72,68,82],12);const view=new DataView(data.buffer);view.setUint32(16,width);view.setUint32(20,height);
 return new File([data],'photo.png',{type:'image/png'});
}
function publishRequest(playerId,origin='https://site.test',original=photoFile(1024,1024),portrait=photoFile()){
 const body=new FormData();body.set('playerId',playerId);body.set('photo',original);body.set('portrait',portrait);
 return new Request('https://site.test/api/admin/player-photos/publish',{method:'POST',headers:{cookie:'__Host-ufl_session=sample',origin},body});
}
test('admin and owner publish once for every confirmed team profile, without a pending approval step',async()=>{
 for(const role of ['admin','owner']){
  const {env,db,objects}=photoFixture(role),identity='1790183123676-110',profile='1790179840025';
  const response=await publishPhoto({request:publishRequest(profile),env});assert.equal(response.status,201);assert.equal((await response.json()).identity,identity);
  assert.equal(objects.size,2);assert.equal(db.prepare('SELECT status FROM player_photo_submissions').get().status,'approved');
  const feed=await (await portraitList({env})).json();assert.ok(feed.portraits[identity]);assert.ok(feed.portraits[profile]);assert.ok(feed.byIdentity[identity]);
  const six=await portraitImage({env,params:{playerId:identity}}),ten=await portraitImage({env,params:{playerId:profile}});
  assert.equal(six.status,200);assert.equal(ten.status,200);assert.deepEqual(await six.arrayBuffer(),await ten.arrayBuffer());db.close();
 }
});
test('new membership profile IDs resolve to the same photo identity without name matching',async()=>{
 const {env,db}=photoFixture(),identity='1790183123676-110',profile='future-membership-123';
 db.prepare("UPDATE league_roster_memberships SET profile_id=? WHERE player_id=? AND division='10v10'").run(profile,identity);
 assert.equal((await resolvePhotoPlayer(env,profile)).identity,identity);
 assert.equal((await publishPhoto({request:publishRequest(profile),env})).status,201);
 const feed=await (await portraitList({env})).json();assert.ok(feed.portraits[profile]);assert.ok(feed.byIdentity[identity]);
 assert.equal((await portraitImage({env,params:{playerId:profile}})).status,200);assert.equal(await resolvePhotoPlayer(env,'unlisted-profile'),null);db.close();
});
test('managers, members, signed-out and cross-origin requests cannot directly publish portraits',async()=>{
 for(const [role,origin] of [['member','https://site.test'],[null,'https://site.test'],['admin','https://evil.test']]){
  const {env,db,objects}=photoFixture(role);assert.equal((await publishPhoto({request:publishRequest('1790183123676-110',origin),env})).status,403);
  assert.equal(objects.size,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM player_photo_publications').get().n,0);db.close();
 }
});
test('direct publication validates both files and removes only its new objects if commit fails',async()=>{
 const {env,db,objects,deleted}=photoFixture();
 assert.equal((await publishPhoto({request:publishRequest('1790183123676-110','https://site.test',photoFile(),photoFile(100,100)),env})).status,400);assert.equal(objects.size,0);
 const previous='portraits/previous.png';objects.set(previous,new Uint8Array([1]));env.DB.batch=async()=>{throw new Error('Commit failed');};
 await assert.rejects(publishPhoto({request:publishRequest('1790183123676-110'),env}),/Commit failed/);
 assert.equal(objects.size,1);assert.ok(objects.has(previous));assert.equal(deleted.length,2);assert.ok(!deleted.includes(previous));db.close();
});
test('staff can publish a valid 5 MB original plus its formatted portrait in one bounded request',async()=>{
 const {env,db}=photoFixture();
 assert.equal((await publishPhoto({request:publishRequest('1790183123676-110','https://site.test',photoFile(1024,1024,5*1024*1024)),env})).status,201);db.close();
});
