import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {buildLeagueSchedule} from '../league-engine.js';import {eaTrialSettings} from '../league-ea-trial.js';import {eaTenTrialSettings} from '../league-ea-ten-trial.js';
import {VA_TEST_SOURCES,importVaSchedule,fetchVaSchedule,mergeSharedTestDraft} from '../league-va-schedule.js';
import {importAutomaticTrial} from '../league-ea-auto.js';import {restoreAcceptedResults,leagueStandings} from '../league-results.js';
import {activeCollectionFixtures,collectionWindow} from '../league-collection-window.js';import {collectLeagues} from '../functions/_lib/league-collector.js';
function provider(draft){
 const source=VA_TEST_SOURCES[draft.settings.trialSchedule],dates=[],matches=[];let id=1000;
 for(const offset of [0,7*86400000])for(const round of [1,2]){
  const fixtures=draft.fixtures.filter(f=>f.round===round),round_id=dates.length+1,scheduled_at=(fixtures[0].startsAt+offset)/1000;
  dates.push({round_id,round_name:`Round ${round_id}`,scheduled_at});
  matches.push({'':fixtures.map(f=>({id:id++,competition_season_round_id:round_id,participant_home:{name:f.home.name},participant_away:{name:f.away.name},participant_home_score:99,participant_away_score:98}))});
 }
 return {competition:{id:source.competitionId},season:{id:source.seasonId},schedule:{dates,matches}};
}
test('full VA calendars preserve 6v6 results, details, corrected draw, identities and reload; never import VA scores',async()=>{
 const archive=JSON.parse(await readFile(new URL('../assets/ea-trial-recovery-20261015.json',import.meta.url),'utf8'));
 const original=importAutomaticTrial(buildLeagueSchedule(eaTrialSettings()),archive.matches).draft;
 const updated=importVaSchedule(original,provider(original));
 assert.equal(updated.fixtures.length,20);assert.equal(updated.nights.length,2);assert.deepEqual(updated.acceptedResults,original.acceptedResults);
 assert.equal(updated.fixtures.filter(f=>f.date==='2026-10-22').length,10);
 const restored=restoreAcceptedResults(buildLeagueSchedule(JSON.parse(JSON.stringify(updated.settings))),updated.acceptedResults);
 assert.deepEqual(restored.acceptedResults,original.acceptedResults);assert.deepEqual(leagueStandings(restored),leagueStandings(original));
 assert(updated.settings.vaSchedule.fixtures.every(f=>!('homeScore'in f)&&!('awayScore'in f)));
});
test('both formats automatically activate their next night, preserve aliases and exact provider DST timestamps',()=>{
 for(const settings of [eaTrialSettings(),eaTenTrialSettings()]){
  const original=buildLeagueSchedule(settings),props=provider(original);
  props.schedule.matches.forEach(group=>group[''].forEach(m=>{m.participant_home.name=m.participant_home.name.replace('Ta6asco Kids','Ta6ascoKids').replace('UFL Real Madrid','Real Madrid').replace('LAFC','LA FC').replace('’',"'");}));
  const updated=importVaSchedule(original,props),next=updated.nights[1].fixtures[0],start=next.startsAt;
  assert.equal(activeCollectionFixtures(updated,start-15*60000).length,original.fixtures.length);
  assert.equal(activeCollectionFixtures(updated,start-16*60000).length,0);assert.equal(activeCollectionFixtures(updated,start+91*60000).length,0);
  assert.deepEqual(collectionWindow(updated,next),{from:start-15*60000,to:start+90*60000});
  assert.equal(updated.acceptedResults.length,0,'posted provider scores never count');
  props.schedule.dates[2].scheduled_at=1793934000;props.schedule.dates[3].scheduled_at=1793935800;
  const dst=importVaSchedule(original,props);assert.equal(dst.fixtures.filter(f=>f.date==='2026-11-05').length,original.fixtures.length);
  assert.equal(dst.nights[1].fixtures[0].startsAt,1793934000000);
 }
});
test('shared calendar reaches an existing browser draft without overwriting local-only corrections',()=>{
 const local=buildLeagueSchedule(eaTenTrialSettings()),shared=importVaSchedule(local,provider(local));
 const correction={fixtureId:local.fixtures[0].id,matchId:'reviewed',homeScore:0,awayScore:0,correction:{localOnly:true}};
 local.acceptedResults=[correction];shared.acceptedResults=[{...correction,homeScore:3,correction:{}}];
 const merged=mergeSharedTestDraft(local,shared);assert.equal(merged.fixtures.length,16);assert.deepEqual(merged.acceptedResults,[correction]);
 assert.equal(buildLeagueSchedule(JSON.parse(JSON.stringify(merged.settings))).fixtures.length,16);
});
test('bad, empty, duplicated or mismatched VA schedules fail closed and keep accepted fixtures',async()=>{
 const draft=buildLeagueSchedule(eaTrialSettings());
 for(const mutate of [p=>p.season.id=99,p=>p.schedule.matches=[],p=>p.schedule.dates[0].scheduled_at=0,p=>p.schedule.matches[0][''][0].participant_home.name='Unknown',p=>p.schedule.matches[0][''][1].id=p.schedule.matches[0][''][0].id]){
  const props=provider(draft);mutate(props);assert.throws(()=>importVaSchedule(draft,props));
 }
 draft.acceptedResults=[{fixtureId:draft.fixtures[0].id}];const props=provider(draft);props.schedule.matches[0][''].shift();assert.throws(()=>importVaSchedule(draft,props),/remove an accepted/);
 await assert.rejects(fetchVaSchedule(VA_TEST_SOURCES[draft.settings.trialSchedule],async()=>new Response('Unavailable',{status:503})),/503/);
});
test('worker refreshes calendar without EA calls outside windows; VA failure retains saved fixtures and active polling',async()=>{
 const original=buildLeagueSchedule(eaTrialSettings()),props=provider(original),updated=importVaSchedule(original,props,{now:original.fixtures[0].startsAt});
 let stored={settings:updated.settings,acceptedResults:[]},last,calls=0,calendarCalls=0;
 const DB={prepare(sql){return{bind(...args){this.args=args;return this;},async all(){return{results:sql.includes('enabled=1')?[{id:'trial',revision:1,draft_json:JSON.stringify(stored)}]:[]};},async run(){last=this.args;return{meta:{changes:1}};}};}};
 const readFeed=async(id,type)=>{calls++;return{type,available:true,matches:[],attempts:[]};};
 await collectLeagues({DB},{now:original.fixtures[0].startsAt+86400000,readFeed,readCalendar:async()=>{calendarCalls++;return props;}});
 assert.equal(calendarCalls,1);assert.equal(calls,0);assert.equal(JSON.parse(last[0]).settings.vaSchedule.fixtures.length,20);
 const next=updated.nights[1].fixtures[0].startsAt;
 await collectLeagues({DB},{now:next,readFeed,readCalendar:async()=>{throw Error('VA temporarily offline');}});
 assert.equal(calls,18);assert.deepEqual(JSON.parse(last[0]).settings.vaSchedule,stored.settings.vaSchedule);assert.match(JSON.parse(last[2]).warnings.join(' '),/using saved fixtures/);assert.equal(JSON.parse(last[2]).polling,true);
});
