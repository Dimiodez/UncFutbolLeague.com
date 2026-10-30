import test from 'node:test';import assert from 'node:assert/strict';
import {automaticCandidates} from '../league-suite-runtime/league-ea-candidates.js';import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';import {eaTrialSettings} from '../league-suite-runtime/league-ea-trial.js';import {eaTenTrialSettings} from '../league-suite-runtime/league-ea-ten-trial.js';import {importAutomaticTrial} from '../league-suite-runtime/league-ea-auto.js';import {stagePendingResults} from '../league-suite-runtime/league-pending-results.js';
function game(f,id,seconds,rating=7){return {matchId:id,timestamp:f.startsAt/1000+600,clubs:{[f.home.eaClubId]:{goals:0},[f.away.eaClubId]:{goals:3}},players:{[f.home.eaClubId]:{one:{playername:'One',rating,gameTime:seconds,goals:0,assists:0}},[f.away.eaClubId]:{two:{playername:'Two',rating:8,gameTime:seconds,goals:3,assists:0}}}};}
for(const settings of [eaTrialSettings,eaTenTrialSettings])test(`${settings().format}: unique full-length match counts over known short retries without merging sheets`,()=>{
 const d=buildLeagueSchedule(settings()),f=d.fixtures[0],complete=game(f,'900001',5532),short=game(f,'900002',208),restart=game(f,'900003',60),all=[restart,complete,short],before=structuredClone(all);assert.deepEqual(automaticCandidates(all),[complete]);assert.deepEqual(all,before);
 const imported=importAutomaticTrial(d,all,f.startsAt+60*60000).draft;assert.equal(imported.acceptedResults.length,1);assert.equal(imported.acceptedResults[0].matchId,complete.matchId);assert.equal(imported.acceptedResults[0].appearances.length,2);assert.equal(stagePendingResults(imported,all,f.startsAt+60*60000).pendingResults.length,0);
});
test('two full matches, unknown durations or no full match remain ambiguous',()=>{
 const f=buildLeagueSchedule(eaTrialSettings()).fixtures[0],full=game(f,'1',5400),other=game(f,'2',5500),short=game(f,'3',208),unknown=game(f,'4',null),oneSided=game(f,'5',5500);oneSided.players[f.away.eaClubId].two.gameTime=50;
 for(const games of [[full,other],[full,unknown],[short,unknown],[short,game(f,'6',100)],[full,oneSided]])assert.equal(automaticCandidates(games).length,2);
});
test('a completed 3–0 with a 3.0 rating still requires review even after short retries are identified',()=>{
 const d=buildLeagueSchedule(eaTrialSettings()),f=d.fixtures[0],games=[game(f,'1',5532,3),game(f,'2',208)];assert.equal(importAutomaticTrial(d,games,f.startsAt+60*60000).added,0);assert.equal(stagePendingResults(d,games,f.startsAt+60*60000).pendingResults.length,1);
});
