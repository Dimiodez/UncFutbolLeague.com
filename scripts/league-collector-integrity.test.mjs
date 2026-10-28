import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {archiveMatches,preferredMatch} from '../league-suite-runtime/functions/_lib/ea-match-archive.js';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';
import {eaTrialSettings} from '../league-suite-runtime/league-ea-trial.js';
import {eaTenTrialSettings} from '../league-suite-runtime/league-ea-ten-trial.js';
import {importAutomaticTrial} from '../league-suite-runtime/league-ea-auto.js';
import {needsResultReview,correctFixture} from '../league-suite-runtime/league-result-corrections.js';
import {stagePendingResults} from '../league-suite-runtime/league-pending-results.js';
import {projectLeague} from '../functions/_lib/league-centre.js';
import {collectLeagues} from '../league-suite-runtime/functions/_lib/league-collector.js';
import {importVaSchedule,VA_TEST_SOURCES} from '../league-suite-runtime/league-va-schedule.js';

function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE preview_ea_match_archive(league_id TEXT,match_id TEXT,game_json TEXT,PRIMARY KEY(league_id,match_id));');sqlite.exec(fs.readFileSync(new URL('../league-collectors/migrations/0001_ea_observations.sql',import.meta.url),'utf8'));return {sqlite,prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){const result=sqlite.prepare(sql).run(...this.args);return {meta:{changes:Number(result.changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};}
function game(f,{id='real-match',score=[3,0],rating=7,passes=10}={}){return {matchId:id,timestamp:f.startsAt/1000+600,clubs:{[f.home.eaClubId]:{goals:score[0],winnerByDnf:1},[f.away.eaClubId]:{goals:score[1]}},players:{[f.home.eaClubId]:{one:{playername:'One',pos:'forward',rating,goals:score[0],assists:0,shots:4,passattempts:12,passesmade:passes,tackleattempts:3,tacklesmade:2,mom:1}},[f.away.eaClubId]:{two:{playername:'Two',pos:'midfielder',rating:6.5,goals:0,assists:0,shots:1,passattempts:8,passesmade:7,tackleattempts:2,tacklesmade:1,mom:0}}}};}

for(const settings of [eaTrialSettings,eaTenTrialSettings])test(`${settings().format}: clean 3–0 and 0–3 count automatically; missing/3.0 ratings require review`,()=>{
 const draft=buildLeagueSchedule(settings()),f=draft.fixtures[0],now=f.startsAt+30*60000;
 for(const score of [[3,0],[0,3]]){const g=game(f,{score});assert.equal(needsResultReview(g),false);const collected=importAutomaticTrial(draft,[g],now).draft;assert.equal(collected.acceptedResults.length,1);assert.equal(stagePendingResults(collected,[g],now).pendingResults.length,0);assert.equal(projectLeague({draft:collected}).totals.played,1);
  for(const rating of [null,'',3,'3.0',0,11]){const broken=game(f,{score,rating});assert.equal(importAutomaticTrial(draft,[broken],now).added,0);assert.equal(stagePendingResults(draft,[broken],now).pendingResults.length,1);}
 }
 const flat=game(f);flat.players={one:{...flat.players[f.home.eaClubId].one,clubId:f.home.eaClubId},two:{...flat.players[f.away.eaClubId].two,clubId:f.away.eaClubId}};assert.equal(needsResultReview(flat),false);flat.players.two.rating=3;assert.equal(needsResultReview(flat),true);
 assert.equal(needsResultReview(game(f,{score:[6,0],rating:3})),false,'The requested extra rating check applies to 3–0/0–3 scores');
});

test('a later complete EA sheet replaces the initial incomplete archive and updates the saved standings/stat projection',async()=>{
 const db=database(),draft=buildLeagueSchedule(eaTenTrialSettings()),f=draft.fixtures[0],first=game(f,{rating:3}),final=game(f,{rating:8,passes:11});
 let games=await archiveMatches(db,'test',[first]);assert.equal(importAutomaticTrial(draft,games,f.startsAt+30*60000).added,0);
 games=await archiveMatches(db,'test',[final]);const accepted=importAutomaticTrial(draft,games,f.startsAt+30*60000).draft;assert.equal(accepted.acceptedResults.length,1);assert.equal(accepted.acceptedResults[0].appearances[0].details.passesCompleted,11);assert.equal(projectLeague({draft:accepted}).players.find(p=>p.name==='One').rating,8);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM preview_ea_match_observations').get().n,2);await archiveMatches(db,'test',[{...final,timeAgo:{number:10,unit:'minutes'}}]);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM preview_ea_match_observations').get().n,2);db.sqlite.close();
});

test('new complete EA values enrich accepted results while manual score/stat corrections stay fixed',async()=>{
 const db=database(),draft=buildLeagueSchedule(eaTenTrialSettings()),f=draft.fixtures[0],first=game(f,{score:[2,0]}),later=game(f,{score:[2,0],passes:11});
 let games=await archiveMatches(db,'test',[first]),accepted=importAutomaticTrial(draft,games,f.startsAt+30*60000).draft;games=await archiveMatches(db,'test',[later]);assert.equal(importAutomaticTrial(accepted,games,f.startsAt+35*60000).draft.acceptedResults[0].appearances[0].details.passesCompleted,11);
 const corrected=correctFixture(accepted,f.id,{homeScore:0,awayScore:0,reason:'Owner confirmed regulation draw',appearances:accepted.acceptedResults[0].appearances});assert.deepEqual(importAutomaticTrial(corrected,games,f.startsAt+40*60000).draft.acceptedResults,corrected.acceptedResults);db.sqlite.close();
});

test('incomplete polls cannot replace a complete archive; first and conflicting observations are retained',async()=>{
 const db=database(),f=buildLeagueSchedule(eaTenTrialSettings()).fixtures[0],good=game(f),poor=game(f,{rating:3});delete poor.players[f.away.eaClubId];
 db.sqlite.prepare('INSERT INTO preview_ea_match_archive VALUES(?,?,?)').run('test',good.matchId,JSON.stringify(good));const [saved]=await archiveMatches(db,'test',[poor]);assert.deepEqual(saved,good);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM preview_ea_match_observations').get().n,2);
 const other={...good,clubs:{unrelated:{goals:0}}};assert.deepEqual(preferredMatch(good,other),good);assert.throws(()=>preferredMatch(good,{...good,matchId:'another'}),/different/);db.sqlite.close();
});

test('both Workers deploy the same collector and database, isolated by league format, with five-minute cron',()=>{
 for(const format of ['6v6','10v10']){const text=fs.readFileSync(new URL(`../league-collectors/wrangler-${format}.toml`,import.meta.url),'utf8');assert(text.includes(`LEAGUE_FORMAT = "${format}"`));assert(text.includes('crons = ["*/5 * * * *"]'));assert(text.includes('6f0ee529-d74f-443f-9165-ffb746d210f1'));}
 const worker=fs.readFileSync(new URL('../league-collectors/worker.js',import.meta.url),'utf8');assert(worker.includes('../league-suite-runtime/functions/_lib/league-collector.js'));assert(!worker.includes('virtualarena'));
});

for(const settings of [eaTrialSettings,eaTenTrialSettings])test(`${settings().format}: scheduled collection saves EA scores, full stats and standings with VA offline and no browser`,async()=>{
 const db=database();db.sqlite.exec('CREATE TABLE preview_league_results(id TEXT PRIMARY KEY,draft_json TEXT,revision INTEGER,enabled INTEGER,checked_at TEXT,succeeded_at TEXT,health TEXT,updated_at TEXT);CREATE TABLE preview_collection_runs(id TEXT PRIMARY KEY,league_id TEXT,checked_at TEXT,mode TEXT,status TEXT,diagnostics_json TEXT);');
 const initial=buildLeagueSchedule(settings()),source=VA_TEST_SOURCES[initial.settings.trialSchedule],f=initial.fixtures[0],round_id=1;
 const draft=importVaSchedule(initial,{competition:{id:source.competitionId},season:{id:source.seasonId},schedule:{dates:[{round_id,round_name:'Round 1',scheduled_at:f.startsAt/1000}],matches:[{'':[ {id:9001,competition_season_round_id:round_id,participant_home:{name:f.home.name},participant_away:{name:f.away.name}} ]}]}},{now:f.startsAt-86400000});
 db.sqlite.prepare('INSERT INTO preview_league_results(id,draft_json,revision,enabled) VALUES(?,?,1,1)').run('test',JSON.stringify(draft));let calls=0;
 await collectLeagues({DB:db,LEAGUE_FORMAT:draft.settings.format},{now:f.startsAt+30*60000,readCalendar:async()=>{throw Error('VA is offline');},readFeed:async(id,type)=>{calls++;return {type,available:true,source:'EA direct',matches:type==='friendly'?[game(draft.fixtures[0])]:[],attempts:[]};}});
 const row=db.sqlite.prepare('SELECT * FROM preview_league_results').get(),saved=JSON.parse(row.draft_json),view=projectLeague(row);assert(calls>0);assert.equal(saved.acceptedResults.length,1);assert.equal(view.totals.played,1);assert.equal(view.totals.appearances,2);assert.equal(view.standings.find(t=>t.id===f.home.id).points,3);assert.equal(view.players.find(p=>p.name==='One').passesCompleted,10);assert.equal(JSON.parse(row.health).error,undefined);assert.equal(db.sqlite.prepare('SELECT status FROM preview_collection_runs').get().status,'success');assert(JSON.parse(row.health).warnings.some(w=>w.includes('VA is offline')));assert.equal(db.sqlite.prepare('SELECT count(*) n FROM preview_ea_match_observations').get().n,1);db.sqlite.close();
});
