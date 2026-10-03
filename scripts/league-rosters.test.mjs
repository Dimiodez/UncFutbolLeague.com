import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestPost as write,onRequestGet as adminRead} from '../functions/api/admin/players.js';
import {rosterSnapshot,discordName} from '../functions/_lib/league-rosters.js';
import {resolvePhotoPlayer} from '../functions/_lib/player-photos.js';
import {ROSTER_CLUBS} from '../functions/_lib/roster-clubs.js';
function fixture(role='admin'){
 const db=new DatabaseSync(':memory:');db.exec(`PRAGMA foreign_keys=ON;CREATE TABLE users(discord_id TEXT PRIMARY KEY);INSERT INTO users VALUES('staff');CREATE TABLE audit_log(actor_discord_id TEXT REFERENCES users(discord_id),action TEXT,details TEXT);`);
 const seed=readFileSync(new URL('../migrations/0012_league_rosters.sql',import.meta.url),'utf8');db.exec(seed);
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
