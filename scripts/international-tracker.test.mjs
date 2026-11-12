import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {internationalTrackerSettings,internationalTrackerApi} from '../functions/_lib/international-tracker.js';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';
import {INTERNATIONAL_COUNTRIES,INTERNATIONAL_TRACKER_ID as ID,INTERNATIONAL_COLLECTOR_RELEASE as RELEASE} from '../league-suite-runtime/league-international-schedule.js';
import {collectLeagues} from '../league-suite-runtime/functions/_lib/league-collector.js';
import {hostedFetchPlan} from '../league-suite-runtime/functions/_lib/ea-hosted-feed.js';
import {collectionPlan} from '../league-suite-runtime/league-collection-policy.js';
import {projectLeague} from '../functions/_lib/league-centre.js';
import {validWorkshopTeamId} from '../league-suite-runtime/league-team-identity.js';
const teams=()=>INTERNATIONAL_COUNTRIES.map((id,i)=>({id,name:id,ea_club_id:String(800000+i)}));
function setup(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE preview_league_results(id TEXT PRIMARY KEY,draft_json TEXT,revision INTEGER DEFAULT 1,enabled INTEGER DEFAULT 1,checked_at TEXT,succeeded_at TEXT,health TEXT,updated_at TEXT);CREATE TABLE preview_collection_runs(id TEXT PRIMARY KEY,league_id TEXT,checked_at TEXT,mode TEXT,status TEXT,diagnostics_json TEXT);CREATE TABLE preview_ea_match_archive(league_id TEXT,match_id TEXT,game_json TEXT,PRIMARY KEY(league_id,match_id));CREATE TABLE international_teams(competition_id TEXT,id TEXT,name TEXT,ea_club_id TEXT);');
 for(const file of ['0001_ea_observations.sql','0002_ea_hosted_feed.sql','0003_ea_feed_requests.sql'])sqlite.exec(fs.readFileSync(new URL('../league-collectors/migrations/'+file,import.meta.url),'utf8'));
 for(const t of teams())sqlite.prepare('INSERT INTO international_teams VALUES(?,?,?,?)').run('ufl-internationals',t.id,t.name,t.ea_club_id);
 const DB={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...this.args).changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 return {sqlite,DB,env:{DB,LEAGUE_SUITE_DB:DB,SUITE_ACTOR:{role:'owner',discord_id:'owner'},LEAGUE_FORMAT:'6v6'},row:()=>sqlite.prepare('SELECT * FROM preview_league_results WHERE id=?').get(ID)};
}
const req=(body,origin='https://site.test')=>new Request('https://site.test/api/league-suite/international-tracker',{method:body?'POST':'GET',headers:{origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const ready={fetcher:async()=>Response.json({release:RELEASE})};
test('international tracker retains verified fixture IDs and tonight’s ten fixtures, excluding old history and knockouts',()=>{
 const settings=internationalTrackerSettings(teams()),d=buildLeagueSchedule(settings);
 assert.equal(d.fixtures.length,35);assert.equal(d.fixtures.filter(f=>f.date==='2026-11-12').length,10);assert(d.fixtures.every(f=>f.stage==='league'&&f.id.startsWith('va-intl-')&&f.date>='2026-11-12'));
 assert(d.settings.teams.every(t=>validWorkshopTeamId(t.id,undefined,d.settings.internationalSchedule)));
 assert.equal(collectionPlan(d,{},Date.parse('2026-11-12T23:44:59Z')).mode,'idle');assert.equal(collectionPlan(d,{},Date.parse('2026-11-12T23:45:00Z')).mode,'live');assert.equal(collectionPlan(d,{},Date.parse('2026-11-13T02:30:00Z')).mode,'live');
 assert.throws(()=>buildLeagueSchedule({...settings,teams:settings.teams.map((t,i)=>i===1?{...t,eaClubId:settings.teams[0].eaClubId}:t)}),/distinct/);
 assert.throws(()=>buildLeagueSchedule({...settings,internationalSchedule:{...settings.internationalSchedule,fixtures:[...settings.internationalSchedule.fixtures,settings.internationalSchedule.fixtures[0]]}}),/Invalid/);
});
test('prepare is disabled by default, activation requires new worker build, reruns and stale revisions cannot replace results',async()=>{
 const s=setup();assert.equal((await internationalTrackerApi(req({action:'prepare'}),s.env,ready)).status,200);assert.equal(s.row().enabled,0);
 assert.equal((await internationalTrackerApi(req({action:'prepare'}),s.env,ready)).status,409);
 assert.equal((await internationalTrackerApi(req({action:'start',revision:1}),s.env,{fetcher:async()=>Response.json({release:'old'})})).status,409);assert.equal(s.row().enabled,0);
 assert.equal((await internationalTrackerApi(req({action:'start',revision:1}),s.env,ready)).status,200);assert.equal(s.row().enabled,1);
 assert.equal((await internationalTrackerApi(req({action:'stop',revision:1}),s.env,ready)).status,409);
 s.sqlite.prepare("UPDATE international_teams SET ea_club_id=NULL WHERE id='ITA'").run();assert.equal((await internationalTrackerApi(req({action:'stop',revision:2}),s.env,ready)).status,200);assert.equal(s.row().enabled,0);s.sqlite.close();
});
test('tracker authorization, CSRF and changed national links are enforced',async()=>{
 const s=setup();for(const role of [null,'member','manager'])assert.equal((await internationalTrackerApi(req({action:'prepare'}),{...s.env,SUITE_ACTOR:role?{role}:null},ready)).status,403);
 assert.equal((await internationalTrackerApi(req({action:'prepare'},'https://evil.test'),s.env,ready)).status,403);
 await internationalTrackerApi(req({action:'prepare'}),s.env,ready);s.sqlite.prepare("UPDATE international_teams SET ea_club_id='99999' WHERE id='ITA'").run();assert.equal((await internationalTrackerApi(req({action:'start',revision:1}),s.env,ready)).status,409);assert.equal(s.row().enabled,0);s.sqlite.close();
});
test('six-format worker automatically collects international games, stats and tables without VA; repeated polling stays duplicate-free',async()=>{
 const s=setup(),draft=buildLeagueSchedule(internationalTrackerSettings(teams()));s.sqlite.prepare('INSERT INTO preview_league_results(id,draft_json) VALUES(?,?)').run(ID,JSON.stringify(draft));
 const tonight=draft.fixtures.filter(f=>f.date==='2026-11-12'),now=Date.parse('2026-11-13T01:15:00Z');
 const games=tonight.map((f,i)=>({matchId:String(990000+i),timestamp:f.startsAt/1000+300,clubs:{[f.home.eaClubId]:{goals:2},[f.away.eaClubId]:{goals:1}},players:{[f.home.eaClubId]:{home:{playername:'Home '+f.home.id,rating:8,goals:2,assists:0,passattempts:10,passesmade:9}},[f.away.eaClubId]:{away:{playername:'Away '+f.away.id,rating:7,goals:1,assists:0}}}}));
 const plan=await hostedFetchPlan(s.DB,now);assert.equal(plan.clubs.length,10);
 const options={now,readCalendar:async()=>{throw Error('VA must not be called');},readFeed:async(id,type)=>({type,available:true,source:'EA test evidence',matches:type==='friendly'?games.filter(g=>g.clubs[id]):[],attempts:[]})};
 for(let i=0;i<3;i++)await collectLeagues(s.env,{...options,now:now+i*300000});
 const saved=JSON.parse(s.row().draft_json);assert.equal(saved.acceptedResults.length,10);assert.equal(saved.pendingResults.length,0);
 const projection=projectLeague(s.row());assert.equal(projection.totals.played,10);assert.equal(projection.totals.goals,30);assert.equal(projection.standings.reduce((n,t)=>n+t.played,0),20);assert.equal(projection.players.reduce((n,p)=>n+p.apps,0),20);assert.equal(projection.players.reduce((n,p)=>n+p.goals,0),30);assert.equal(projection.competitionKind,'international');
 const before=s.row().draft_json;await collectLeagues({...s.env,LEAGUE_FORMAT:'10v10'},options);assert.equal(s.row().draft_json,before);s.sqlite.close();
});
test('missing EA feeds stay failed rather than inventing results or standings',async()=>{
 const s=setup(),d=buildLeagueSchedule(internationalTrackerSettings(teams()));s.sqlite.prepare('INSERT INTO preview_league_results(id,draft_json) VALUES(?,?)').run(ID,JSON.stringify(d));
 await collectLeagues(s.env,{now:Date.parse('2026-11-13T00:20:00Z'),readFeed:async(id,type)=>({type,available:false,matches:[],attempts:['EA outage']})});
 assert.equal(JSON.parse(s.row().health).upstreamStatus,'failed');assert.equal(projectLeague(s.row()).totals.played,0);assert.equal(JSON.parse(s.row().draft_json).acceptedResults.length,0);s.sqlite.close();
});
