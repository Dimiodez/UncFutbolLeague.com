import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {buildLeagueSchedule} from '../league-engine.js';import {eaTrialSettings} from '../league-ea-trial.js';import {importAutomaticTrial} from '../league-ea-auto.js';import {correctFixture,needsResultReview} from '../league-result-corrections.js';import {restoreAcceptedResults,leagueStandings} from '../league-results.js';
test('confirmed quit is a protected draw and manual stats survive reload/recheck',async()=>{
 const snapshot=JSON.parse(await readFile(new URL('../assets/ea-trial-recovery-20261015.json',import.meta.url),'utf8')),draft=importAutomaticTrial(buildLeagueSchedule(eaTrialSettings()),snapshot.matches).draft;
 const quit=draft.acceptedResults.find(r=>r.matchId==='106222996430420');assert.equal(quit.homeScore,0);assert.equal(quit.awayScore,0);assert.equal(quit.eaOriginal.homeScore,3);assert(quit.correction.statsReview);
 for(const name of ['UFL Arsenal','UFL Druzhba'])assert.equal(leagueStandings(draft).find(t=>t.name===name).points,4);
 const correction=correctFixture(draft,quit.fixtureId,{homeScore:0,awayScore:0,reason:'Checked regulation screenshot',appearances:quit.appearances.map((p,i)=>i? p:{...p,rating:9.2})});
 assert.deepEqual(importAutomaticTrial(correction,snapshot.matches).draft.acceptedResults,correction.acceptedResults);
 assert.deepEqual(restoreAcceptedResults(buildLeagueSchedule(correction.settings),correction.acceptedResults).acceptedResults,correction.acceptedResults);
 correction.acceptedResults.find(r=>r.fixtureId===quit.fixtureId).correction.localOnly=true;
 assert.equal(restoreAcceptedResults(buildLeagueSchedule(correction.settings),correction.acceptedResults).acceptedResults.find(r=>r.fixtureId===quit.fixtureId).correction.localOnly,true);
 const shared={...draft,settings:{...draft.settings,trialSchedule:null,collectionEnabled:true}};
 assert.equal(correctFixture(shared,quit.fixtureId,{homeScore:0,awayScore:0,reason:'Standard shared draw test',finish:'extraTime'}).acceptedResults.at(-1).finish,'standard');
 assert.throws(()=>correctFixture(draft,quit.fixtureId,{homeScore:0,awayScore:0,reason:''}));assert(needsResultReview({clubs:{a:{goals:3},b:{goals:0}}}));assert(!needsResultReview({clubs:{a:{goals:2},b:{goals:1}}}));
});
