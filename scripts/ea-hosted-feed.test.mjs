import {ensureHostedTransport} from '../league-suite-runtime/functions/_lib/ea-transport-watchdog.js';
import {collectionPlan} from '../league-suite-runtime/league-collection-policy.js';
import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
import {hostedFetchPlan,hostedFeedApi,readCollectedMatchType} from '../league-suite-runtime/functions/_lib/ea-hosted-feed.js';
import {collectHosted,monitorHosted,hostedMonitorDeadline} from './collect-ea-hosted.mjs';
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
 s.sqlite.prepare("INSERT INTO preview_ea_feed_cache VALUES(?,'friendly',?,?)").run(s.f.home.eaClubId,JSON.stringify([s.game]),new Date(s.now).toISOString());feed=await readCollectedMatchType(s.env,s.f.home.eaClubId,'friendly','friendlyMatch',{now:s.now,readDirect});assert.equal(feed.available,true);assert.match(feed.source,/hosted/);assert.deepEqual(feed.matches,[s.game]);assert.deepEqual(feed.attempts,[]);
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

test('one hosted runner keeps polling after a transient failure without waiting for another scheduled job',async()=>{
 let at=0,calls=0;const summary=await monitorHosted({deadline:2000,interval:1000,now:()=>at,sleep:async ms=>{at+=ms;},collect:async()=>{calls++;if(calls===2)throw Error('Temporary EA failure');}});assert.equal(calls,3);assert.deepEqual(summary,{polls:3,failedPolls:1});assert.equal(at,2000);
});
test('hosted monitor reports an unresolved final feed failure',async()=>{
 let at=0;await assert.rejects(()=>monitorHosted({deadline:1000,interval:1000,now:()=>at,sleep:async ms=>{at+=ms;},collect:async()=>{throw Error('EA unavailable');}}),/EA unavailable/);
});

 test('fresh hosted routing never calls blocked Cloudflare EA; stale data still fails honestly',async()=>{
 const s=setup();let directCalls=0;
 s.sqlite.prepare("INSERT INTO preview_ea_feed_cache VALUES(?,'friendly',?,?)").run(s.f.home.eaClubId,JSON.stringify([s.game]),new Date(s.now).toISOString());
 const readDirect=async(id,type)=>{directCalls++;return failed(type);};
 const feed=await readCollectedMatchType(s.env,s.f.home.eaClubId,'friendly','friendlyMatch',{now:s.now,readDirect});assert.equal(feed.available,true);assert.equal(directCalls,0);assert.deepEqual(feed.matches,[s.game]);
 const stale=await readCollectedMatchType(s.env,s.f.home.eaClubId,'friendly','friendlyMatch',{now:s.now+16*60000,readDirect});assert.equal(stale.available,false);assert.equal(directCalls,1);s.sqlite.close();
 });
 test('hosted matchnight schedule has independent staggered retries, not one nightly trigger',()=>{
 const workflow=fs.readFileSync(new URL('../.github/workflows/ea-hosted-feed.yml',import.meta.url),'utf8');assert.match(workflow,/7,17,27,37,47,57 0-7 \* \* 3,5/);assert.match(workflow,/github.event_name == 'workflow_dispatch' && inputs.monitor/);
 });

test('scheduled hosted monitor stays below the job timeout and covers the matchnight',()=>{
 const early=Date.parse('2026-11-06T00:00:00Z'),live=Date.parse('2026-11-06T03:00:00Z');
 assert.equal(hostedMonitorDeadline(early),Date.parse('2026-11-06T05:30:00Z'));
 assert.equal(hostedMonitorDeadline(live),Date.parse('2026-11-06T06:55:00Z'));
 const workflow=fs.readFileSync(new URL('../.github/workflows/ea-hosted-feed.yml',import.meta.url),'utf8');assert.match(workflow,/EA_FEED_MONITOR:.*github.event_name == 'schedule'/);
});

test('independent timer dispatches stale hosted transport once per cooldown without changing league records',async()=>{
 const s=setup(),before=s.sqlite.prepare('SELECT draft_json FROM preview_league_results').get().draft_json,requests=[];
 const env={...s.env,EA_FEED_DISPATCH_TOKEN:'test-only-credential'.repeat(3)},fetcher=async(url,options)=>{requests.push({url,options});return new Response(null,{status:204});};
 const results=await Promise.all([ensureHostedTransport(env,{now:s.now,fetcher}),ensureHostedTransport(env,{now:s.now,fetcher})]);
 assert.equal(requests.length,1);assert(results.some(r=>r.status==='dispatched'));assert(results.some(r=>r.status==='cooldown'));
 assert.equal(requests[0].url,'https://api.github.com/repos/Dimiodez/UncFutbolLeague.com/actions/workflows/ea-hosted-feed.yml/dispatches');
 assert.equal(requests[0].options.redirect,'manual');assert.deepEqual(JSON.parse(requests[0].options.body),{ref:'master',inputs:{monitor:true}});
 assert.equal(s.sqlite.prepare('SELECT draft_json FROM preview_league_results').get().draft_json,before);
 await ensureHostedTransport(env,{now:s.now+10*60000,fetcher});assert.equal(requests.length,2);s.sqlite.close();
});
test('fresh feed and non-coordinator worker do not dispatch or require additional access',async()=>{
 const s=setup();for(const t of s.draft.settings.teams)s.sqlite.prepare("INSERT INTO preview_ea_feed_cache VALUES(?,'friendly','[]',?)").run(t.eaClubId,new Date(s.now).toISOString());
 const fetcher=async()=>{throw Error('Unexpected GitHub request');};
 assert.equal((await ensureHostedTransport(s.env,{now:s.now,fetcher})).status,'fresh');
 assert.equal((await ensureHostedTransport({...s.env,LEAGUE_FORMAT:'10v10'},{now:s.now,fetcher})).status,'not-coordinator');
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM preview_collection_runs').get().n,0);s.sqlite.close();
});
test('watchdog records unavailable credential and dispatch rejection honestly without exposing credentials',async()=>{
 const s=setup();let calls=0;
 assert.equal((await ensureHostedTransport(s.env,{now:s.now,fetcher:async()=>{calls++;}})).status,'not-configured');assert.equal(calls,0);
 const credential='secret-test-value'.repeat(3);
 const result=await ensureHostedTransport({...s.env,EA_FEED_DISPATCH_TOKEN:credential},{now:s.now+10*60000,fetcher:async()=>new Response(null,{status:401})});
 assert.equal(result.status,'dispatch-failed');assert.equal(result.error,'GitHub dispatch HTTP 401');
 assert(!JSON.stringify(s.sqlite.prepare('SELECT * FROM preview_collection_runs').all()).includes(credential));s.sqlite.close();
});
test('staff-held score review does not repeatedly fetch blocked feeds after the match window',async()=>{
 const s=setup(),held=s.draft.fixtures[0].id;
 const draft={...s.draft,acceptedResults:s.draft.fixtures.slice(1).map(f=>({fixtureId:f.id})),pendingResults:[{fixtureId:held,staffReviewRequired:true}]};
 s.sqlite.prepare('UPDATE preview_league_results SET draft_json=?').run(JSON.stringify(draft));
 const now=Math.max(...draft.fixtures.map(f=>f.startsAt))+4*3600000;
 assert.equal(collectionPlan(draft,{},now).mode,'idle');assert.equal(collectionPlan(draft,{},now).missingCount,0);
 assert.deepEqual((await hostedFetchPlan(s.db,now)).clubs,[]);
 assert.equal((await ensureHostedTransport(s.env,{now,fetcher:async()=>{throw Error('Review must not dispatch');}})).status,'not-needed');
 assert((await hostedFetchPlan(s.db,s.now)).clubs.length>0,'Live collection still retains evidence during the match window');
 s.sqlite.prepare('UPDATE preview_league_results SET draft_json=?').run(JSON.stringify({...draft,pendingResults:[]}));
 assert((await hostedFetchPlan(s.db,now)).clubs.length>0,'Unresolved non-held fixtures remain eligible for automatic recovery');s.sqlite.close();
});

test('idle timer verifies each installed credential with one read-only preflight dispatch',async()=>{
 const s=setup(),now=s.now+8*86400000,credential='readiness-test-value'.repeat(3),requests=[],before=s.sqlite.prepare('SELECT draft_json FROM preview_league_results').get().draft_json;
 const env={...s.env,EA_FEED_DISPATCH_TOKEN:credential},fetcher=async(url,options)=>{requests.push({url,options});return new Response(null,{status:204});};
 const results=await Promise.all([ensureHostedTransport(env,{now,fetcher}),ensureHostedTransport(env,{now,fetcher})]);
 assert.equal(requests.length,1);assert(results.some(r=>r.credentialCheck?.status==='readiness-dispatched'));
 assert.deepEqual(JSON.parse(requests[0].options.body),{ref:'master',inputs:{preflight:true,clubs:'["374656"]',monitor:false}});
 await ensureHostedTransport(env,{now:now+86400000,fetcher});assert.equal(requests.length,1);
 await ensureHostedTransport({...env,EA_FEED_DISPATCH_TOKEN:credential+'rotated'},{now:now+86400000,fetcher});assert.equal(requests.length,2);
 assert.equal(s.sqlite.prepare('SELECT draft_json FROM preview_league_results').get().draft_json,before);
 assert(!JSON.stringify(s.sqlite.prepare('SELECT * FROM preview_collection_runs').all()).includes(credential));s.sqlite.close();
});
test('idle credential check retries rejection after cooldown rather than claiming success',async()=>{
 const s=setup(),now=s.now+8*86400000,env={...s.env,EA_FEED_DISPATCH_TOKEN:'test-readiness-token'.repeat(3)};let calls=0;
 const fetcher=async()=>{calls++;return new Response(null,{status:403});};
 assert.equal((await ensureHostedTransport(env,{now,fetcher})).credentialCheck.status,'readiness-failed');
 await ensureHostedTransport(env,{now:now+5*60000,fetcher});assert.equal(calls,1);
 await ensureHostedTransport(env,{now:now+10*60000,fetcher});assert.equal(calls,2);s.sqlite.close();
});

test('readiness records GitHub permission rejection details without disclosing authorization',async()=>{
 const s=setup(),now=s.now+8*86400000,env={...s.env,EA_FEED_DISPATCH_TOKEN:'permission-check-test'.repeat(3)};
 const result=await ensureHostedTransport(env,{now,fetcher:async()=>Response.json({message:'Resource not accessible by personal access token'},{status:403,headers:{'x-accepted-github-permissions':'actions=write'}})});
 assert.match(result.credentialCheck.error,/Resource not accessible by personal access token/);
 assert.match(result.credentialCheck.error,/actions=write/);
 assert(!JSON.stringify(result).includes(env.EA_FEED_DISPATCH_TOKEN));s.sqlite.close();
});
