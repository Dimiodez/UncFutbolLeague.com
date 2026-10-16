import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildLeagueSchedule} from '../league-engine.js';
import {eaTrialSettings} from '../league-ea-trial.js';
import {importAutomaticTrial} from '../league-ea-auto.js';
import {acceptedAppearances,restoreAcceptedResults,leagueStandings} from '../league-results.js';
import {playerTotals} from '../league-player-stats.js';
test('real October 15 EA recovery retains ten results and 116 player appearances',async()=>{
 const archive=JSON.parse(await readFile(new URL('../assets/ea-trial-recovery-20261015.json',import.meta.url),'utf8'));
 const draft=buildLeagueSchedule(eaTrialSettings()),result=importAutomaticTrial(draft,archive.matches,Date.parse('2026-10-16T04:00:00Z'));
 assert.equal(result.added,10);const records=acceptedAppearances(result.draft);assert.equal(records.length,116);assert(records.every(p=>p.position!=='UNK'));assert(records.every(p=>p.rating>0));
 assert(playerTotals(records).some(p=>p.known.passes&&p.totals.passes>0));assert.equal(leagueStandings(result.draft).reduce((s,t)=>s+t.played,0),20);
 assert.deepEqual(restoreAcceptedResults(draft,JSON.parse(JSON.stringify(result.draft.acceptedResults))).acceptedResults,result.draft.acceptedResults);
 assert.equal(importAutomaticTrial(result.draft,archive.matches).added,0);assert.equal(importAutomaticTrial(result.draft,archive.matches).updated,0);
 const incomplete={...result.draft,acceptedResults:result.draft.acceptedResults.map(r=>r.correction?r:{...r,appearances:[]})},enriched=importAutomaticTrial(incomplete,archive.matches);assert.equal(enriched.added,0);assert.equal(enriched.updated,9);assert.equal(acceptedAppearances(enriched.draft).length,116);
});
