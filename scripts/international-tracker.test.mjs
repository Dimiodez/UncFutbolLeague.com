import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {internationalTrackerSettings,internationalTrackerApi} from '../functions/_lib/international-tracker.js';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';
import {INTERNATIONAL_COUNTRIES,INTERNATIONAL_TRACKER_ID as ID,INTERNATIONAL_COLLECTOR_RELEASE as RELEASE} from '../league-suite-runtime/league-international-schedule.js';
import {collectLeagues} from '../league-suite-runtime/functions/_lib/league-collector.js';
import {hostedFetchPlan} from '../league-suite-runtime/functions/_lib/ea-hosted-feed.js';
import {collectionPlan} from '../league-suite-runtime/league-collection-policy.js';
import {projectLeague} from '../functions/_lib/league-centre.js';
import {validWorkshopTeamId} from '../league-suite-runtime/league-team-identity.js';
import {planInternationalBaseline,INTERNATIONAL_BASELINE_EVIDENCE} from '../functions/_lib/international-baseline.js';
import {baselineGames,baselineTeams} from './fixtures/international-baseline.mjs';
import {mergeSharedTestDraft} from '../league-suite-runtime/league-va-schedule.js';
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

const baselineDraft=()=>({settings:internationalTrackerSettings(baselineTeams()),acceptedResults:[],pendingResults:[]});
const baselinePlan=(saved=baselineDraft(),games=baselineGames())=>planInternationalBaseline(saved,games,{actor:'owner',now:'2026-11-12T23:59:00Z'});
test('VA baseline reproduces all ten reports, standings and player aggregates, with confirmed kickoff times',()=>{
 const before=baselineDraft(),copy=JSON.stringify(before),{next,summary}=baselinePlan(before);
 assert.equal(JSON.stringify(before),copy);assert.deepEqual(summary,{matches:10,goals:28,appearances:113,players:59,totalMatches:10,existingResultsPreserved:0,tonight:'9:00 / 9:30 PM Central'});
 const p=projectLeague({draft:next});assert.equal(p.fixtures.length,45);assert.equal(p.sourceCounts['va-report'],10);assert.equal(p.players.length,59);
 const tonight=p.fixtures.filter(f=>f.date==='2026-11-12');assert.equal(tonight.length,10);assert.deepEqual([...new Set(tonight.map(f=>new Date(f.startsAt).toISOString()))],['2026-11-13T03:00:00.000Z','2026-11-13T03:30:00.000Z']);
 const future=before.settings.internationalSchedule.fixtures.filter(f=>f.startsAt>Date.parse('2026-11-14'));for(const f of future)assert.equal(next.settings.internationalSchedule.fixtures.find(n=>n.id===f.id).startsAt,f.startsAt);
 for(const r of next.acceptedResults){assert(r.correction);assert(r.appearances.every(p=>p.vaReport.userId));assert.equal(r.matchId,INTERNATIONAL_BASELINE_EVIDENCE.reports.find(s=>s.fixtureId===r.fixtureId).ea.matchId);}
 assert.throws(()=>baselinePlan(next),/already imported/);
 const browser=mergeSharedTestDraft(buildLeagueSchedule(before.settings),next);assert.equal(browser.fixtures.length,45);assert.equal(browser.acceptedResults.length,10);assert.deepEqual(browser.internationalBaseline,next.internationalBaseline);assert.equal(browser.fixtures.find(f=>f.id===tonight[0].id).startsAt,tonight[0].startsAt);
});
test('baseline fails without exact EA evidence, conflicting names or valid stats and never partially modifies input',()=>{
 const saved=baselineDraft(),before=JSON.stringify(saved),games=baselineGames();
 assert.throws(()=>baselinePlan(saved,games.slice(1)),/evidence is missing/);
 const bad=structuredClone(games),club=Object.keys(bad[0].players)[0],player=Object.values(bad[0].players[club])[0];player.playername+=' changed';assert.throws(()=>baselinePlan(saved,bad),/identity needs review/);
 const ambiguous=structuredClone(games);ambiguous[0].players[club].duplicate=structuredClone(Object.values(ambiguous[0].players[club])[0]);assert.throws(()=>baselinePlan(saved,ambiguous),/identity needs review/);
 const source=structuredClone(INTERNATIONAL_BASELINE_EVIDENCE);Object.values(source.reports[0].match.participant_home_stats)[0].goals=-1;
 assert.throws(()=>planInternationalBaseline(saved,games,{actor:'owner',source}),/Invalid historical/);assert.equal(JSON.stringify(saved),before);
 const withTonight=baselineDraft();withTonight.pendingResults=[{fixtureId:withTonight.settings.internationalSchedule.fixtures[0].id}];assert.throws(()=>baselinePlan(withTonight),/Tonight already has recorded evidence/);
});
test('baseline keeps existing future results and future EA appearances continue the same VA player with weighted ratings',()=>{
 const saved=baselineDraft(),settings=buildLeagueSchedule(saved.settings),future=settings.fixtures.find(f=>f.date>'2026-11-12'&&[f.home.id,f.away.id].includes('USA'));
 const original=baselinePlan().next,link=original.internationalBaseline.playerLinks.find(l=>l.teamId==='USA'),before=projectLeague({draft:original}).players.find(p=>p.playerId===link.playerId&&p.teamId==='USA');
 const record={fixtureId:future.id,matchId:'future-ea',timestamp:future.startsAt,homeScore:1,awayScore:0,finish:'standard',appearances:[{playerId:link.eaPlayerId,name:'EA name',teamId:'USA',rating:10,goals:1,assists:0,position:'ST',details:{}}]};
 saved.acceptedResults=[record];const {next,summary}=baselinePlan(saved);assert.equal(summary.existingResultsPreserved,1);assert.deepEqual(next.acceptedResults.find(r=>r.matchId==='future-ea'),record);
 const p=projectLeague({draft:next}),after=p.players.find(p=>p.playerId===link.playerId&&p.teamId==='USA');assert.equal(after.apps,before.apps+1);assert.equal(after.goals,before.goals+1);assert.equal(after.ratingCount,before.ratingCount+1);
 const historical=original.acceptedResults.flatMap(r=>r.appearances).filter(p=>p.playerId===link.eaPlayerId&&p.teamId==='USA'&&p.rating!==null&&p.rating!==3);assert(Math.abs(after.rating-(historical.reduce((n,p)=>n+p.rating,0)+10)/(historical.length+1))<.00001);assert.equal(p.players.length,59);
});
function seededBaseline(){const s=setup(),draft=baselineDraft();s.sqlite.prepare('INSERT INTO preview_league_results(id,draft_json,enabled) VALUES(?,?,1)').run(ID,JSON.stringify(draft));for(const [i,g] of baselineGames().entries())s.sqlite.prepare('INSERT INTO preview_ea_feed_cache(club_id,match_type,body_json,checked_at) VALUES(?,?,?,?)').run(String(i),'friendly',JSON.stringify([g]),'2026-11-12 23:55:00');return s;}
test('baseline preview is read-only; apply is audited, revision guarded, enabled and duplicate safe',async()=>{
 const s=seededBaseline(),before=s.row(),preview=await internationalTrackerApi(req({action:'preview-baseline',revision:1}),s.env,ready),plan=await preview.json();assert.equal(preview.status,200,JSON.stringify(plan));assert.equal(s.row().draft_json,before.draft_json);assert.equal(s.row().revision,1);
 assert.equal((await internationalTrackerApi(req({action:'import-baseline',revision:1,digest:'wrong'}),s.env,ready)).status,409);
 assert.equal((await internationalTrackerApi(req({action:'import-baseline',revision:0,digest:plan.digest}),s.env,ready)).status,409);
 const apply=await internationalTrackerApi(req({action:'import-baseline',revision:1,digest:plan.digest}),s.env,ready);assert.equal(apply.status,200,await apply.text());assert.equal(s.row().enabled,1);assert.equal(s.row().revision,2);
 const audit=s.sqlite.prepare('SELECT * FROM preview_international_baseline_audit').get();assert.equal(JSON.parse(audit.before_json).draft_json,before.draft_json);assert.equal(audit.after_json,s.row().draft_json);assert.equal(audit.source_digest,plan.digest);
 assert.equal((await internationalTrackerApi(req({action:'import-baseline',revision:2,digest:plan.digest}),s.env,ready)).status,400);assert.equal(s.sqlite.prepare('SELECT count(*) n FROM preview_international_baseline_audit').get().n,1);
 const data=await (await internationalTrackerApi(req(),s.env,ready)).json();assert.equal(data.baseline.matches,10);assert.equal(data.tonight.first,'21:00');s.sqlite.close();
});
test('baseline import rolls back completely on a concurrent collector revision and collector preserves protected history',async()=>{
 const s=seededBaseline(),plan=await (await internationalTrackerApi(req({action:'preview-baseline',revision:1}),s.env,ready)).json(),batch=s.DB.batch;
 s.DB.batch=async statements=>{s.sqlite.exec('UPDATE preview_league_results SET revision=revision+1');return batch(statements);};
 assert.equal((await internationalTrackerApi(req({action:'import-baseline',revision:1,digest:plan.digest}),s.env,ready)).status,409);assert.equal(JSON.parse(s.row().draft_json).acceptedResults.length,0);assert.equal(s.sqlite.prepare('SELECT count(*) n FROM preview_international_baseline_audit').get().n,0);
 const saved=baselinePlan().next;s.sqlite.prepare('UPDATE preview_league_results SET draft_json=?').run(JSON.stringify(saved));await collectLeagues(s.env,{now:Date.parse('2026-11-13T03:45:00Z'),readFeed:async(id,type)=>({type,available:true,matches:type==='friendly'?baselineGames().filter(g=>g.clubs[id]):[],attempts:[]})});
 const after=JSON.parse(s.row().draft_json);assert.deepEqual(after.internationalBaseline,saved.internationalBaseline);assert.deepEqual(after.acceptedResults,saved.acceptedResults);s.sqlite.close();
});
