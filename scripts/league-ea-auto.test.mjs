import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-engine.js';
import {eaTrialSettings} from '../league-ea-trial.js';
import {importAutomaticTrial} from '../league-ea-auto.js';
import {leagueStandings,restoreAcceptedResults} from '../league-results.js';
test('auto trial imports unique scheduled games, not practice or duplicates, without inventing finish',()=>{
 const d=buildLeagueSchedule(eaTrialSettings()),f=d.fixtures[4],g={matchId:'991',timestamp:(f.startsAt+900000)/1000,clubs:{[f.home.eaClubId]:{goals:3},[f.away.eaClubId]:{goals:1}},players:{[f.home.eaClubId]:{p:{playername:'Player',rating:8,goals:3,assists:0}}}};
 assert.equal(importAutomaticTrial(d,[g],f.startsAt-1).added,0);
 const result=importAutomaticTrial(d,[g,g],f.startsAt+1800000);assert.equal(result.added,1);assert.equal(result.draft.acceptedResults[0].finish,'standard');
 const table=leagueStandings(result.draft),home=table.find(t=>t.id===f.home.id);assert.equal(home.played,1);assert.equal(home.goalsFor,3);assert.equal(home.points,3);assert.equal(home.regularWins,1);
 assert.equal(importAutomaticTrial(result.draft,[g],f.startsAt+1800000).added,0);
 assert.equal(importAutomaticTrial(d,[g,{...g,matchId:'992'}],f.startsAt+1800000).added,0);
 assert.equal(importAutomaticTrial(d,[{...g,timestamp:g.timestamp-86400}],f.startsAt+1800000).added,0);
 assert.deepEqual(restoreAcceptedResults(buildLeagueSchedule(d.settings),result.draft.acceptedResults).acceptedResults,result.draft.acceptedResults);
 const draw=importAutomaticTrial(d,[{...g,clubs:{[f.home.eaClubId]:{goals:2},[f.away.eaClubId]:{goals:2}}}],f.startsAt+1800000);assert.equal(draw.added,1);const drawRows=leagueStandings(draw.draft).filter(t=>t.played);assert(drawRows.every(t=>t.points===1&&t.draws===1));
});
