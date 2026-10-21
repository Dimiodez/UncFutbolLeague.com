import test from 'node:test';import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';import {eaTenTrialSettings} from '../league-suite-runtime/league-ea-ten-trial.js';
import {activeCollectionFixtures} from '../league-suite-runtime/league-collection-window.js';import {stagePendingResults,acceptPendingResult} from '../league-suite-runtime/league-pending-results.js';import {leagueStandings} from '../league-suite-runtime/league-results.js';
test('live private suite preserves the timed polling and pending draw acceptance boundary',()=>{
 const draft=buildLeagueSchedule(eaTenTrialSettings()),fixture=draft.fixtures[0],now=fixture.startsAt;
 assert.equal(activeCollectionFixtures(draft,now-15*60000).length,8);assert.equal(activeCollectionFixtures(draft,now+91*60000).length,0);
 const game={matchId:'pending-review',timestamp:now/1000+600,clubs:{[fixture.home.eaClubId]:{goals:3,winnerByDnf:1},[fixture.away.eaClubId]:{goals:0}},players:{}};
 const pending=stagePendingResults(draft,[game],now+15*60000);assert.equal(pending.pendingResults.length,1);assert(leagueStandings(pending).every(t=>t.played===0));
 const accepted=acceptPendingResult(pending,fixture.id,game.matchId,{homeScore:0,awayScore:0,reason:'Owner confirmed regulation draw'});assert.equal(accepted.acceptedResults[0].eaOriginal.homeScore,3);assert.equal(accepted.pendingResults.length,0);assert.equal(leagueStandings(accepted).filter(t=>t.points===1).length,2);
});
