import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
import {hostedFetchPlan,hostedFeedApi,readCollectedMatchType} from '../league-suite-runtime/functions/_lib/ea-hosted-feed.js';
import {collectHosted} from './collect-ea-hosted.mjs';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';import {eaTrialSettings} from '../league-suite-runtime/league-ea-trial.js';import {eaTenTrialSettings} from '../league-suite-runtime/league-ea-ten-trial.js';
import {collectLeagues} from '../league-suite-runtime/functions/_lib/league-collector.js';
const key='a'.repeat(64),failed=type=>({type,available:false,matches:[],attempts:['EA direct: HTTP 403','relay: HTTP 500']});
function setup(settings=eaTrialSettings()){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE preview_league_results(id TEXT PRIMARY KEY,draft_json TEXT,revision INTEGER DEFAULT 1,enabled INTEGER DEFAULT 1,checked_at TEXT,succeeded_at TEXT,health TEXT,updated_at TEXT);CREATE TABLE preview_collection_runs(id TEXT PRIMARY KEY,league_id TEXT,checked_at TEXT,mode TEXT,status TEXT,diagnostics_json TEXT);CREATE TABLE preview_ea_match_archive(league_id TEXT,match_id TEXT,game_json TEXT,PRIMARY KEY(league_id,match_id));');for(const name of ['0001_ea_observations.sql','0002_ea_hosted_feed.sql'])sqlite.exec(fs.readFileSync(new URL('../league-collectors/migrations/'+name,import.meta.url),'utf8'));
 const draft=buildLeagueSchedule(settings),f=draft.fixtures[0],now=f.startsAt+30*60000;sqlite.prepare('INSERT INTO preview_league_results(id,draft_json) VALUES(?,?)').run('test',JSON.stringify(draft));
 const db={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...this.args).changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const game={matchId:'900001',timestamp:(f.startsAt+10*60000)/1000,clubs:{[f.home.eaClubId]:{goals:2},[f.away.eaClubId]:{goals:1}},players:{[f.home.eaClubId]:{one:{playername:'One',rating:8,goals:2,assists:0,passattempts:10,passesmade:9}},[f.away.eaClubId]:{two:{playername:'Two',rating:7,goals:1,assists:0}}}};
 return {sqlite,db,draft,f,now,game,env:{DB:db,EA_FEED_INGEST_KEY:key,LEAGUE_FORMAT:settings.format}};
}
const request=(path,body,credential=key)=>new Request('https://worker.test'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+credential,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});

test('machine feed is authenticated, scoped, fresh, and never writes scores directly',async()=>{
 const s=setup(),body={clubId:s.f.home.eaClubId,type:'friendly',fetchedAt:new Date(s.now).toISOString(),matches:[s.game]};
 assert.equal((await hostedFeedApi(request('/ea-fetch-plan',null,'wrong'),s.env,{now:s.now})).status,401);assert.equal((await hostedFeedApi(request('/ea-fetch-plan'),{...s.env,EA_FEED_INGEST_KEY:undefined},{now:s.now})).status,401);
 const plan=await(await hostedFeedApi(request('/ea-fetch-plan'),s.env,{now:s.now})).json();assert(plan.clubs.includes(s.f.home.eaClubId));assert(!JSON.stringify(plan).includes('players'));
 assert.equal((await hostedFeedApi(request('/ea-feed',{...body,clubId:'99999999'}),s.env,{now:s.now})).status,409);
 assert.equal((await hostedFeedApi(request('/ea-feed',{...body,fetchedAt:new Date(s.now-4*60000).toISOString()}),s.env,{now:s.now})).status,400);
 assert.equal((await hostedFeedApi(request('/ea-feed',{...body,matches:[{...s.game,clubs:{999:{goals:1},888:{goals:0}}}]}),s.env,{now:s.now})).status,400);
 const before=s.sqlite.prepare('SELECT draft_json FROM preview_league_results').get().draft_json;assert.equal((await hostedFeedApi(request('/ea-feed',body),s.env,{now:s.now})).status,200);assert.equal(s.sqlite.prepare('SELECT draft_json FROM preview_league_results').get().draft_json,before);assert.deepEqual(JSON.parse(s.sqlite.prepare('SELECT body_json FROM preview_ea_feed_cache').get().body_json),[s.game]);s.sqlite.close();
});

test('failed Cloudflare fetch uses only fresh real EA cache and does not turn stale/missing feeds into empty success',async()=>{
 const s=setup(),readDirect=async(id,type)=>failed(type);let feed=await readCollectedMatchType(s.env,s.f.home.eaClubId,'friendly','friendlyMatch',{now:s.now,readDirect});assert.equal(feed.available,false);
 s.sqlite.prepare("INSERT INTO preview_ea_feed_cache VALUES(?,'friendly',?,?)").run(s.f.home.eaClubId,JSON.stringify([s.game]),new Date(s.now).toISOString());feed=await readCollectedMatchType(s.env,s.f.home.eaClubId,'friendly','friendlyMatch',{now:s.now,readDirect});assert.equal(feed.available,true);assert.match(feed.source,/hosted/);assert.deepEqual(feed.matches,[s.game]);assert.equal(feed.attempts[0],'EA direct: HTTP 403');
 assert.equal((await readCollectedMatchType(s.env,s.f.home.eaClubId,'friendly','friendlyMatch',{now:s.now+16*60000,readDirect})).available,false);assert.equal((await readCollectedMatchType(s.env,s.f.home.eaClubId,'league','leagueMatch',{now:s.now,readDirect})).available,false);s.sqlite.close();
});

for(const settings of [eaTrialSettings,eaTenTrialSettings])test(`${settings().format}: cron consumes hosted EA data after direct/relay failures, preserving results on repeat`,async()=>{
 const s=setup(settings());for(const team of s.draft.settings.teams)s.sqlite.prepare("INSERT INTO preview_ea_feed_cache VALUES(?,'friendly',?,?)").run(team.eaClubId,JSON.stringify([s.game]),new Date(s.now).toISOString());
 const options={now:s.now,readFeed:(id,type,ea)=>readCollectedMatchType(s.env,id,type,ea,{now:s.now,readDirect:async(id,type)=>failed(type)})};await collectLeagues(s.env,options);let row=s.sqlite.prepare('SELECT * FROM preview_league_results').get(),saved=JSON.parse(row.draft_json);assert.equal(saved.acceptedResults.length,1);assert.equal(saved.acceptedResults[0].appearances[0].details.passesCompleted,9);assert.equal(JSON.parse(row.health).upstreamStatus,'healthy');assert.equal(JSON.parse(row.health).lastEAsuccess,new Date(s.now).toISOString());
 const before=JSON.stringify(saved.acceptedResults);await collectLeagues(s.env,options);row=s.sqlite.prepare('SELECT * FROM preview_league_results').get();assert.equal(JSON.stringify(JSON.parse(row.draft_json).acceptedResults),before);s.sqlite.close();
});

test('hosted runner submits only successful EA-direct friendly responses and reports failures',async()=>{
 const key='b'.repeat(64),requests=[],fetcher=async(url,opts)=>{requests.push({url,opts});return Response.json(url.endsWith('/ea-fetch-plan')?{clubs:['123']}:{});};
 const result=await collectHosted({key,fetcher,readFeed:async()=>({available:true,source:'EA direct',matches:[]})});assert.equal(result.stored,1);assert.equal(requests.length,2);assert.equal(JSON.parse(requests[1].opts.body).type,'friendly');requests.length=0;
 await assert.rejects(()=>collectHosted({key,fetcher,readFeed:async()=>failed('friendly')}),/failed/);assert.equal(requests.length,1);await assert.rejects(()=>collectHosted({key:'',fetcher}),/credential/);
});
