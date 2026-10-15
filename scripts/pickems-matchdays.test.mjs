import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {syncPickemMatchesFromAsset} from '../functions/_lib/pickems.js';
import {onRequestPost} from '../functions/api/pickems/ballot.js';
import {sha256} from '../functions/_lib/auth.js';
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
async function setup(){
 const db=new DatabaseSync(':memory:');
 for(const file of ['0001_auth.sql','0002_pickems.sql','0007_pickem_competitions.sql'])db.exec(read(`migrations/${file}`));
 db.prepare("INSERT INTO users(discord_id,username,display_name) VALUES('qa','qa','QA')").run();
 db.prepare("INSERT INTO sessions(id_hash,discord_id,expires_at) VALUES(?,'qa','2099-01-01')").run(await sha256('test-session'));
 const season=JSON.parse(read('pickems-app/seasons/s2-10v10.json'));
 for(const day of season.weeks){day.scheduledAt=Math.floor(Date.now()/1000)+3600*day.week;for(const match of day.matches){match[3]=null;match[4]=null;match[5]=day.scheduledAt;}}
 const env={DB:{prepare(sql){return{params:[],bind(...params){this.params=params;return this;},async run(){return{meta:db.prepare(sql).run(...this.params)};},async all(){return{results:db.prepare(sql).all(...this.params)};},async first(){return db.prepare(sql).get(...this.params);}};},async batch(statements){db.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(await s.run());db.exec('COMMIT');return rows;}catch(e){db.exec('ROLLBACK');throw e;}}},ASSETS:{async fetch(){return Response.json(season);}}};
 return{db,env,season};
}
const request=body=>new Request('https://www.uncfutbolleague.com/api/pickems/ballot',{method:'POST',headers:{origin:'https://www.uncfutbolleague.com',cookie:'__Host-ufl_session=test-session','content-type':'application/json'},body:JSON.stringify(body)});
test('both rounds share a ballot and lock, while archived rows and picks remain intact',async()=>{
 const {db,env,season}=await setup();
 db.prepare("INSERT INTO picks(discord_id,match_id,choice) VALUES('qa',77,'home')").run();
 const archive=db.prepare("SELECT * FROM pickem_matches WHERE competition_key='s1-6v6'").all();
 await syncPickemMatchesFromAsset(request({}),env,'s2-10v10');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM pickem_matches WHERE competition_key='s2-10v10'").get().n,season.weeks.flatMap(w=>w.matches).length);
 assert.deepEqual(db.prepare("SELECT * FROM pickem_matches WHERE competition_key='s1-6v6'").all(),archive);
 const first=db.prepare("SELECT * FROM pickem_matches WHERE competition_key='s2-10v10' AND week=1").all();
 assert.equal(first.length,season.weeks[0].matches.length);assert.equal(new Set(first.map(m=>m.scheduled_at)).size,1);
 const ballot={competition:'s2-10v10',week:1,picks:Object.fromEntries(first.map(m=>[m.id,'home'])),tiebreaker:3};
 assert.equal((await onRequestPost({request:request(ballot),env})).status,200);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM picks").get().n,first.length+1);
 assert.equal((await onRequestPost({request:request({...ballot,picks:{...ballot.picks,999999:'home'}}),env})).status,400);
 // Round two cannot reopen the ballot after the first round starts.
 season.weeks[0].scheduledAt=Math.floor(Date.now()/1000)-1;
 assert.equal((await onRequestPost({request:request(ballot),env})).status,409);
 assert.equal(db.prepare("SELECT choice FROM picks WHERE match_id=77").get().choice,'home');
});
test('schedule team links use stable club identities and preserve current BYEs',()=>{
 const app=read('app.js'),context=vm.createContext({window:{},URLSearchParams,console});
 vm.runInContext(read('pickems-app/season-data.js'),context);
 vm.runInContext(app.slice(0,app.indexOf('function homePage()'))+read('league-season2.js')+read('player-portraits.js')+read('league-pages.js')+app.slice(app.indexOf('function defaultScheduleWeek('),app.indexOf('function communityEventsPage(')),context);
 const html=vm.runInContext("schedulesPage(new URLSearchParams('season=2&type=10v10&matchday=all'))",context);
 assert.match(html,/clubs\/club-1790120967830\?season=2&division=10v10/);
 const season=JSON.parse(read('pickems-app/seasons/s2-10v10.json'));
 assert.equal((html.match(/No match this round/g)||[]).length,2*season.weeks.flatMap(w=>w.byes||[]).length);
 assert.match(html,/10:00 PM EDT/);assert.match(html,/10:30 PM EDT/);
 assert.match(html,/Matchday 7/);
});
