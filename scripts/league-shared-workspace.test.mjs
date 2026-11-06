import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileSharedLeagues} from '../league-suite-assets/league-shared-workspace.js';
import {eaTrialSettings} from '../league-suite-assets/league-ea-trial.js';
import {eaTenTrialSettings} from '../league-suite-assets/league-ea-ten-trial.js';
import {buildLeagueSchedule} from '../league-suite-assets/league-engine.js';
const rows=()=>[eaTrialSettings(),eaTenTrialSettings()].map(settings=>({id:settings.trialSchedule,enabled:1,draft:{settings,acceptedResults:[],pendingResults:[]}}));
test('fresh browser recovers both actual shared leagues without registering new leagues',()=>{
 const remote=rows(),before=JSON.stringify(remote),drafts=reconcileSharedLeagues([],remote);
 assert.equal(drafts.length,2);
 assert.deepEqual(drafts.map(d=>d.settings.serverLeagueId),remote.map(r=>r.id));
 assert(drafts.every(d=>d.fixtures.length>0));
 assert.equal(JSON.stringify(remote),before);
 assert.equal(reconcileSharedLeagues(drafts,remote).length,2);
});
test('shared hydration preserves unrelated drafts and local-only corrections',()=>{
 const remote=rows(),local=buildLeagueSchedule(remote[0].draft.settings),fixture=local.fixtures[0];
 local.acceptedResults=[{fixtureId:fixture.id,homeScore:1,awayScore:0,correction:{localOnly:true}}];
 const unrelated={settings:{serverLeagueId:'personal-draft'},acceptedResults:[]};
 const drafts=reconcileSharedLeagues([unrelated,local],remote);
 assert.equal(drafts.length,3);assert.equal(drafts[0],unrelated);
 assert.deepEqual(drafts[1].acceptedResults,local.acceptedResults);
});
test('invalid shared response fails without clearing existing data; disabled leagues are not resurrected',()=>{
 const local=[{settings:{serverLeagueId:'personal'}}],before=JSON.stringify(local);
 assert.throws(()=>reconcileSharedLeagues(local,undefined));
 assert.throws(()=>reconcileSharedLeagues(local,[{id:'bad',draft:{}}]));
 assert.equal(JSON.stringify(local),before);
 assert.equal(reconcileSharedLeagues([],rows().map(r=>({...r,enabled:0}))).length,0);
});

test('server-accepted late results and review holds survive fresh-device recovery',()=>{
 const remote=rows(),fixture=buildLeagueSchedule(remote[0].draft.settings).fixtures[0];
 const accepted={fixtureId:fixture.id,homeScore:2,awayScore:0,raw:{timestamp:Math.floor(fixture.startsAt/1000)+97*60}};
 const hold={fixtureId:'awaiting-review',staffReviewRequired:true};
 remote[0].draft.acceptedResults=[accepted];remote[0].draft.pendingResults=[hold];
 const [draft]=reconcileSharedLeagues([],remote);
 assert.deepEqual(draft.acceptedResults,[accepted]);assert.deepEqual(draft.pendingResults,[hold]);
});
