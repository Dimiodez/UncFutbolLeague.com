import test from 'node:test';import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';import {eaTenTrialSettings} from '../league-suite-runtime/league-ea-ten-trial.js';
import {activeCollectionFixtures} from '../league-suite-runtime/league-collection-window.js';import {stagePendingResults,acceptPendingResult} from '../league-suite-runtime/league-pending-results.js';import {leagueStandings} from '../league-suite-runtime/league-results.js';
import {collectionPlan} from '../league-suite-runtime/league-collection-policy.js';
import {readMatchType} from '../league-suite-runtime/functions/_lib/ea-match-feed.js';
test('live private suite preserves the timed polling and pending draw acceptance boundary',()=>{
 const draft=buildLeagueSchedule(eaTenTrialSettings()),fixture=draft.fixtures[0],now=fixture.startsAt;
 assert.equal(activeCollectionFixtures(draft,now-15*60000).length,8);assert.equal(activeCollectionFixtures(draft,now+91*60000).length,0);
 const game={matchId:'pending-review',timestamp:now/1000+600,clubs:{[fixture.home.eaClubId]:{goals:3,winnerByDnf:1},[fixture.away.eaClubId]:{goals:0}},players:{}};
 const pending=stagePendingResults(draft,[game],now+15*60000);assert.equal(pending.pendingResults.length,1);assert(leagueStandings(pending).every(t=>t.played===0));
 const accepted=acceptPendingResult(pending,fixture.id,game.matchId,{homeScore:0,awayScore:0,reason:'Owner confirmed regulation draw'});assert.equal(accepted.acceptedResults[0].eaOriginal.homeScore,3);assert.equal(accepted.pendingResults.length,0);assert.equal(leagueStandings(accepted).filter(t=>t.points===1).length,2);
});
test('private suite retries missed fixtures and uses canonical EA headers instead of relying on the broken friendly relay',async()=>{
 const d=buildLeagueSchedule(eaTenTrialSettings()),start=d.fixtures[0].startsAt;
 assert.equal(collectionPlan(d,{},start+2*86400000).mode,'catchup');
 assert.equal(collectionPlan(d,{lastCatchupCheck:new Date(start+2*86400000).toISOString()},start+2*86400000+10*60000).mode,'idle');
 let called=0;const result=await readMatchType('48360','friendly','friendlyMatch',async(url,options)=>{called++;assert.match(url,/proclubs\.ea\.com/);assert.match(url,/maxResultCount=10/);assert.match(options.headers['user-agent'],/Chrome/);assert.equal(options.headers['sec-fetch-site'],'same-origin');return Response.json([]);});
 assert.equal(called,1);assert.equal(result.available,true);assert.equal(result.source,'EA direct');
});
