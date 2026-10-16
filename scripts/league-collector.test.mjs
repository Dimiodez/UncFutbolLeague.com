import test from 'node:test';
import assert from 'node:assert/strict';
import {collectLeagues} from '../functions/_lib/league-collector.js';
import {previewLeagueResultsApi} from '../functions/_lib/preview-league-results.js';
import {eaTrialSettings} from '../league-ea-trial.js';
import {buildLeagueSchedule} from '../league-engine.js';
import {readFile} from 'node:fs/promises';
import {importAutomaticTrial} from '../league-ea-auto.js';
test('scheduled collection preserves all recovered results and records heartbeat without browser',async()=>{
 const archive=JSON.parse(await readFile(new URL('../assets/ea-trial-recovery-20261015.json',import.meta.url),'utf8'));
 const draft=importAutomaticTrial(buildLeagueSchedule(eaTrialSettings()),archive.matches).draft;
 let update;
 const DB={prepare(sql){return {bind(...args){this.args=args;return this;},async all(){return {results:sql.includes('enabled=1')?[{id:'trial',revision:1,draft_json:JSON.stringify({settings:draft.settings,acceptedResults:draft.acceptedResults})}]:archive.matches.map(game=>({game_json:JSON.stringify(game)}))};},async run(){update={sql,args:this.args};return {meta:{changes:1}};}};}};
 await collectLeagues({DB});assert.match(update.sql,/checked_at=CURRENT_TIMESTAMP/);assert.deepEqual(JSON.parse(update.args[0]).acceptedResults,draft.acceptedResults);
});
test('shared corrections reject signed-out writes before touching stored results',async()=>{
 const response=await previewLeagueResultsApi(new Request('https://preview.example/api/league-results',{method:'POST',headers:{origin:'https://preview.example','content-type':'application/json'},body:'{}'}),{});
 assert.equal(response.status,403);
});
