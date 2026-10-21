import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildLeagueSchedule} from '../league-engine.js';import {eaTrialSettings} from '../league-ea-trial.js';import {eaTenTrialSettings} from '../league-ea-ten-trial.js';
import {activeCollectionFixtures} from '../league-collection-window.js';
import {stagePendingResults,acceptPendingResult,restorePendingResults} from '../league-pending-results.js';
import {leagueStandings} from '../league-results.js';import {importAutomaticTrial} from '../league-ea-auto.js';
import {previewLeagueResultsApi} from '../functions/_lib/preview-league-results.js';
test('both formats poll from 15 minutes before night start through 90 minutes after, including second round',()=>{
 for(const settings of [eaTrialSettings(),eaTenTrialSettings()]){const d=buildLeagueSchedule(settings),start=d.fixtures[0].startsAt;
 assert.equal(activeCollectionFixtures(d,start-15*60000-1).length,0);assert.equal(activeCollectionFixtures(d,start-15*60000).length,d.fixtures.length);assert.equal(activeCollectionFixtures(d,start+30*60000).length,d.fixtures.length);assert.equal(activeCollectionFixtures(d,start+90*60000).length,d.fixtures.length);assert.equal(activeCollectionFixtures(d,start+90*60000+1).length,0);}
});
test('authorized pending acceptance is audited, revision guarded and persists the corrected draw',async()=>{
 const archive=JSON.parse(await readFile(new URL('../assets/ea-trial-recovery-20261015.json',import.meta.url),'utf8')),source=archive.matches.find(g=>String(g.matchId)==='106222996430420'),draft=stagePendingResults(buildLeagueSchedule(eaTrialSettings()),[{...source,matchId:'api-review-quit'}],Date.now()),p=draft.pendingResults[0];let written;
 const DB={prepare(sql){return {bind(...args){this.args=args;return this;},async first(){return sql.includes('FROM sessions')?{discord_id:'owner',role:'owner',status:'active'}:{id:'ufl-6v6-20261015',revision:7,draft_json:JSON.stringify(draft)};}};},async batch(statements){written=JSON.parse(statements[1].args[0]);assert.match(statements[0].args[3],/Confirmed/);return [{meta:{changes:1}},{meta:{changes:1}}];}};
 const request=revision=>new Request('https://preview.example/api/league-results',{method:'POST',headers:{origin:'https://preview.example',cookie:'__Host-ufl_session=test'},body:JSON.stringify({id:'ufl-6v6-20261015',operation:'accept-pending',revision,fixtureId:p.fixtureId,matchId:'api-review-quit',values:{homeScore:0,awayScore:0,reason:'Confirmed regulation draw',statsReview:true}})});
 assert.equal((await previewLeagueResultsApi(request(6),{DB})).status,409);assert.equal(written,undefined);
 assert.equal((await previewLeagueResultsApi(request(7),{DB})).status,200);assert.equal(written.acceptedResults[0].homeScore,0);assert.equal(written.acceptedResults[0].eaOriginal.homeScore,3);assert.equal(written.pendingResults.length,0);
});
test('quit evidence becomes durable pending review, can be accepted as 0–0, never counts twice or overwrites original',async()=>{
 const archive=JSON.parse(await readFile(new URL('../assets/ea-trial-recovery-20261015.json',import.meta.url),'utf8')),source=archive.matches.find(g=>String(g.matchId)==='106222996430420'),draft=buildLeagueSchedule(eaTrialSettings());
 const game={...source,matchId:'review-test-quit'},now=draft.fixtures[0].startsAt+60*60000;
 const pending=stagePendingResults(draft,[game],now);assert.equal(pending.pendingResults.length,1);assert(leagueStandings(pending).every(t=>t.played===0));
 const restored=restorePendingResults(draft,JSON.parse(JSON.stringify(pending.pendingResults))),p=restored.pendingResults[0],candidate=p.candidates[0];assert(candidate.appearances.length>0);
 const accepted=acceptPendingResult(restored,p.fixtureId,candidate.matchId,{homeScore:0,awayScore:0,reason:'Owner verified regulation draw',statsReview:true});assert.equal(accepted.pendingResults.length,0);assert.equal(accepted.acceptedResults.length,1);assert.equal(accepted.acceptedResults[0].eaOriginal.homeScore,3);assert.equal(accepted.acceptedResults[0].homeScore,0);
 assert.deepEqual(importAutomaticTrial(accepted,[game],now).draft.acceptedResults,accepted.acceptedResults);assert.equal(stagePendingResults(accepted,[game],now).pendingResults.length,0);
 assert.throws(()=>acceptPendingResult(accepted,p.fixtureId,candidate.matchId,{homeScore:0,awayScore:0,reason:'Duplicate'}));
 const second={...game,matchId:'review-test-restart'},multiple=stagePendingResults(draft,[game,second],now);assert.equal(multiple.pendingResults[0].candidates.length,2);
});
