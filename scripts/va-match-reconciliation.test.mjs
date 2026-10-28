import test from 'node:test';import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';
import {eaTenTrialSettings} from '../league-suite-runtime/league-ea-ten-trial.js';
import {correctFixture} from '../league-suite-runtime/league-result-corrections.js';
import {reconcileVaMatchReport} from '../league-suite-runtime/league-history.js';
import {restoreAcceptedResults} from '../league-suite-runtime/league-results.js';
import {projectLeague} from '../functions/_lib/league-centre.js';
import {importAutomaticTrial} from '../league-suite-runtime/league-ea-auto.js';
function sample(){let d=buildLeagueSchedule(eaTenTrialSettings());d.fixtures=d.fixtures.map((f,i)=>({...f,vaMatchId:String(9000+i)}));const f=d.fixtures[0],p=(id,name,teamId)=>({playerId:id,name,teamId,position:'MID',rating:3,goals:0,assists:0,details:{passes:10,passesCompleted:0}});
 d=correctFixture(d,f.id,{homeScore:0,awayScore:3,appearances:[p('p1','EAOne',f.home.id),p('p2','EATwo',f.away.id),p('guest','ExtraEAPlayer',f.home.id)],reason:'Previous reviewed EA result'},{actor:'Original reviewer',now:'2026-10-21T03:00:00Z'});
 d=correctFixture(d,d.fixtures[1].id,{homeScore:1,awayScore:0,appearances:[],reason:'Another game to preserve'},{actor:'Original reviewer'});
 const s=(name,position)=>({player_name:name,position,goals:1,assists:1,match_rating:7.1,total_passes:18,successful_passes:16,total_tackles:4,successful_tackles:2,shots:2,saves:0,red_card:false,motm:true,defender_cleansheet:false,dnf:false});
 const props={competition:{id:3},season:{id:5},match:{id:9000,competition_season_id:5,participant_home_id:22,participant_away_id:19,participant_home_score:2,participant_away_score:2,posted_at:'2026-10-21T03:10:00Z',participant_home_stats:{101:s('EAOne','cm')},participant_away_stats:{202:s('EATwo','cb')},participant_home_lineup:{players:{a:{id:101,name:'VA Name One'}}},participant_away_lineup:{players:{b:{id:202,name:'VA Name Two'}}}}};return {d,f,props};}
const options={actor:'Owner-authorized VA reconciliation',now:'2026-10-28T17:30:00Z'};
test('owner-selected VA scores and stats replace only that fixture while preserving EA evidence and other results',()=>{
 const {d,f,props}=sample(),before=structuredClone(d),updated=reconcileVaMatchReport(d,f.id,props,options),r=updated.acceptedResults.find(r=>r.fixtureId===f.id);
 assert.deepEqual(d,before);assert.deepEqual(updated.acceptedResults.map(r=>r.fixtureId),d.acceptedResults.map(r=>r.fixtureId));assert.deepEqual(updated.acceptedResults[1],d.acceptedResults[1]);
 assert.deepEqual([r.homeScore,r.awayScore],[2,2]);assert.equal(r.appearances.length,2);assert.equal(r.appearances[0].playerId,'p1');assert.equal(r.appearances[0].name,'EAOne');assert.equal(r.appearances[0].rating,7.1);assert.equal(r.appearances[0].position,'CM');assert.equal(r.appearances[0].details.passesCompleted,16);assert.equal(r.appearances[0].details.interceptions,null);assert.equal(r.appearances[0].details.manOfTheMatch,1);
 assert.equal(r.history.at(-1).before.appearances.length,3);assert.equal(r.provenance.kind,'va-match-report');assert.equal(r.correction.statsReview,false);assert.equal(r.appearances[0].vaReport.registeredName,'VA Name One');
 assert.strictEqual(reconcileVaMatchReport(updated,f.id,props,options),updated,'Replaying identical VA data must not append audit history');
});
test('VA provenance and detailed values survive normal restoration and project as an owner-reviewed VA report',()=>{
 const {d,f,props}=sample(),updated=reconcileVaMatchReport(d,f.id,props,options),restored=restoreAcceptedResults({...d,acceptedResults:[]},updated.acceptedResults),r=restored.acceptedResults.find(r=>r.fixtureId===f.id);
 assert.deepEqual(r,updated.acceptedResults.find(r=>r.fixtureId===f.id));
 const view=projectLeague({id:'test',draft:updated});assert.equal(view.sourceCounts['va-report'],1);assert.equal(view.fixtures.find(g=>g.id===f.id).source,'va-report');assert.equal(view.fixtures.find(g=>g.id===f.id).statsStatus,'available');
});
test('reconciliation rejects missing authority, wrong seasons, changed participants and unposted reports',()=>{
 const {d,f,props}=sample();assert.throws(()=>reconcileVaMatchReport(d,f.id,props),/actor/);assert.throws(()=>reconcileVaMatchReport(d,f.id,{...props,season:{id:7}},options),/Wrong/);
 const changed=structuredClone(props);changed.match.participant_home_id=21;assert.throws(()=>reconcileVaMatchReport(d,f.id,changed,options),/participants/);
 changed.match.participant_home_id=22;changed.match.posted_at=null;assert.throws(()=>reconcileVaMatchReport(d,f.id,changed,options),/unposted/);
});
test('missing or ambiguous player identities and invalid reported numbers stop reconciliation without guessing',()=>{
 const {d,f,props}=sample(),bad=structuredClone(props);bad.match.participant_home_stats[101].player_name='Another person';assert.throws(()=>reconcileVaMatchReport(d,f.id,bad,options),/identity/);
 bad.match.participant_home_stats[101].player_name='EAOne';bad.match.participant_home_stats[101].match_rating=15;assert.throws(()=>reconcileVaMatchReport(d,f.id,bad,options),/rating/);
 bad.match.participant_home_stats[101].match_rating=7;bad.match.participant_home_stats[101].successful_passes=-1;assert.throws(()=>reconcileVaMatchReport(d,f.id,bad,options),/numeric/);
});
test('later EA collection cannot revert an owner-selected VA score or player sheet',()=>{
 const {d,f,props}=sample(),updated=reconcileVaMatchReport(d,f.id,props,options),before=structuredClone(updated.acceptedResults);
 const ea={matchId:updated.acceptedResults[0].matchId,timestamp:f.startsAt/1000,clubs:{[f.home.eaClubId]:{goals:0},[f.away.eaClubId]:{goals:3}},players:{[f.home.eaClubId]:{p1:{playername:'EAOne',rating:3,goals:0,assists:0}}}};
 const collected=importAutomaticTrial(updated,[ea],Date.parse(options.now));assert.deepEqual(collected.draft.acceptedResults,before);assert.equal(collected.updated,0);
});
