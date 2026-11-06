import test from 'node:test';import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';import {eaTrialSettings} from '../league-suite-runtime/league-ea-trial.js';import {importAutomaticTrial} from '../league-suite-runtime/league-ea-auto.js';
test('explicit staff review blocks an otherwise valid automatic result until resolved',()=>{
 const draft=buildLeagueSchedule(eaTrialSettings()),f=draft.fixtures[0],game={matchId:'staff-hold',timestamp:f.startsAt/1000+600,clubs:{[f.home.eaClubId]:{goals:2},[f.away.eaClubId]:{goals:1}},players:{[f.home.eaClubId]:{one:{playername:'One',goals:2,rating:8}},[f.away.eaClubId]:{two:{playername:'Two',goals:1,rating:7}}}},now=f.startsAt+3600000;
 assert.equal(importAutomaticTrial(draft,[game],now).added,1);
 const held={...draft,pendingResults:[{fixtureId:f.id,staffReviewRequired:true,reason:'Owner checking regulation score',candidates:[]}]};
 const result=importAutomaticTrial(held,[game],now);assert.equal(result.added,0);assert.equal(result.draft.acceptedResults.length,0);assert.equal(result.draft.pendingResults[0].staffReviewRequired,true);
});
