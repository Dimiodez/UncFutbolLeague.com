import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manifest=JSON.parse(read('data/international-rosters-va-20261111.json'));
const migration=read('migrations/20261111_international_va_rosters.sql');
function setup(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON;CREATE TABLE users(discord_id TEXT PRIMARY KEY);');
 db.exec(read('migrations/0012_league_rosters.sql').split('INSERT OR IGNORE INTO league_players')[0]);
 db.exec(read('migrations/0013_player_merges.sql').split('CREATE TRIGGER')[0]);
 db.exec(read('migrations/0019_va_player_links.sql'));
 db.exec(read('migrations/20261106_internationals.sql'));
 db.prepare("INSERT INTO international_competitions(id,name) VALUES('ufl-internationals','UFL Internationals')").run();
 for(const id of new Set(manifest.players.map(p=>p.teamId)))db.prepare("INSERT INTO international_teams(competition_id,id,name,flag,color) VALUES('ufl-internationals',?,?,?,'#fff')").run(id,id,id);
 const players=new Map(manifest.previousMemberships.map(r=>[r.playerId,r.name]));
 for(const row of manifest.players.filter(p=>!p.newProfile))players.set(row.playerId,row.displayName);
 for(const [id,name] of players){
  db.prepare('INSERT INTO league_players(id,discord_name,normalized_name) VALUES(?,?,?)').run(id,name,name.toLowerCase());
  db.prepare("INSERT INTO league_roster_memberships(player_id,season,division,profile_id,team_key,metadata_json) VALUES(?,'2','6v6',?,'original-club',?)").run(id,id,JSON.stringify({position:'CM',approvedPortrait:true}));
 }
 for(const row of manifest.previousMemberships)db.prepare("INSERT INTO international_rosters(id,competition_id,team_id,player_id,display_name,active) VALUES(?,'ufl-internationals',?,?,?,?)").run(row.id,row.teamId,row.playerId,row.name,row.active);
 for(const row of manifest.players.filter(p=>p.match==='VA user ID'))db.prepare('INSERT INTO league_va_player_links(va_user_id,player_id,va_name) VALUES(?,?,?)').run(row.vaUserId,row.playerId,row.vaName);
 return db;
}
const count=(db,table)=>db.prepare('SELECT count(*) n FROM '+table).get().n;
const clubRows=db=>db.prepare('SELECT * FROM league_roster_memberships ORDER BY player_id').all();
test('reviewed import matches all 64 VA registrations without duplicate profiles or changing club memberships',()=>{
 const db=setup(),before=count(db,'league_players'),clubs=clubRows(db);
 db.exec(migration);
 assert.equal(count(db,'league_players'),before+4);
 const rows=db.prepare("SELECT team_id,player_id,display_name FROM international_rosters WHERE active=1 ORDER BY team_id,player_id").all();
 assert.equal(rows.length,64);assert.equal(new Set(rows.map(r=>r.player_id)).size,64);
 for(const p of manifest.players)assert(rows.some(r=>r.player_id===p.playerId&&r.team_id===p.teamId&&r.display_name===p.displayName));
 assert.deepEqual(Object.fromEntries([...new Set(rows.map(r=>r.team_id))].map(id=>[id,rows.filter(r=>r.team_id===id).length])),{ARG:7,BRA:6,CAN:6,ENG:5,ESP:7,FRA:7,GER:6,ITA:6,MEX:7,USA:7});
 assert.deepEqual(clubRows(db),clubs);
 assert.equal(count(db,'league_player_aliases'),0);assert.equal(count(db,'users'),0);
 assert.equal(db.prepare("SELECT count(*) n FROM international_rosters WHERE active=0").get().n,8);
 assert(manifest.retiredMemberships.every(r=>db.prepare('SELECT id FROM league_players WHERE id=?').get(r.playerId)));
 for(const p of manifest.players)assert.equal(db.prepare('SELECT player_id FROM league_va_player_links WHERE va_user_id=?').get(p.vaUserId).player_id,p.playerId);
 assert.equal(db.prepare("SELECT count(*) n FROM international_roster_audit WHERE action='va-import-complete'").get().n,1);
 db.close();
});
test('Germany identities stay distinct and confirmed nicknames reuse the original player profiles',()=>{
 const db=setup();db.exec(migration);
 const link=id=>db.prepare('SELECT player_id FROM league_va_player_links WHERE va_user_id=?').get(id).player_id;
 assert.notEqual(link(95),link(105));
 assert.equal(link(105),'player-va-105');assert.equal(link(110),'intl-player-sivvy');
 assert.equal(link(121),'intl-player-luckybean');assert.equal(link(54),'1790190859698-251');
 assert.equal(db.prepare('SELECT display_name FROM international_rosters WHERE player_id=? AND active=1').get(link(95)).display_name,'connorjudsongarrett');
 db.close();
});
test('replaying the import is a no-op and preserves later administrator edits',()=>{
 const db=setup();db.exec(migration);const audits=count(db,'international_roster_audit'),players=count(db,'league_players');
 db.exec(migration);assert.equal(count(db,'international_roster_audit'),audits);assert.equal(count(db,'league_players'),players);
 db.prepare("UPDATE international_rosters SET display_name='Later approved nickname',active=0 WHERE player_id='player-va-105'").run();
 db.exec(migration);
 assert.equal(db.prepare("SELECT display_name FROM international_rosters WHERE player_id='player-va-105'").get().display_name,'Later approved nickname');
 assert.equal(db.prepare("SELECT count(*) n FROM international_rosters WHERE active=1").get().n,63);db.close();
});
test('changed roster or conflicting VA mapping aborts before any players or memberships are written',()=>{
 for(const change of [
  db=>db.prepare("UPDATE international_rosters SET display_name='Unexpected edit' WHERE id='intl-ARG-1'").run(),
  db=>db.prepare("INSERT INTO league_va_player_links VALUES(999,'intl-player-sivvy','Wrong source',CURRENT_TIMESTAMP)").run(),
  db=>db.prepare("INSERT INTO league_players(id,discord_name,normalized_name) VALUES('unexpected-new-profile','coop9191','coop9191')").run()
 ]){
  const db=setup();change(db);const players=count(db,'league_players'),rows=db.prepare('SELECT * FROM international_rosters ORDER BY id').all(),clubs=clubRows(db);
  assert.throws(()=>db.exec(migration),/malformed JSON/);
  assert.equal(count(db,'league_players'),players);assert.deepEqual(db.prepare('SELECT * FROM international_rosters ORDER BY id').all(),rows);
  assert.deepEqual(clubRows(db),clubs);assert.equal(count(db,'international_roster_audit'),0);db.close();
 }
});

