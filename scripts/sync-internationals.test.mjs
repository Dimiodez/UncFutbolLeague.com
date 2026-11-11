import test from 'node:test';import assert from 'node:assert/strict';
import {buildInternationalSnapshot,normalizeInternationalCore,validateInternationalSnapshot} from './sync-internationals.mjs';
import {internationalFixtureSource} from './fixtures/international-va.mjs';
const time='2026-11-11T12:00:00.000Z';
test('VA import follows every stats page, maps ITL to ITA, keeps stable IDs and future null scores',async()=>{
 const {source,pageProps,requested}=internationalFixtureSource();
 const data=await buildInternationalSnapshot(pageProps,null,{now:()=>time});
 assert.equal(data.totals.played,10);assert.equal(data.players.length,12);assert.equal(data.fixtures.length,52);
 assert.equal(data.players.find(p=>p.name==='Player 11').teamId,'ITA');assert.equal(data.players.find(p=>p.name==='Player 11').rating,null);
 assert(requested.includes('stats/players/goals?page=2'));
 assert.equal(data.players.find(p=>p.name==='Player 0').rating,8.2);assert.equal(data.statsStatus,'available');
 assert.equal(data.fixtures.find(f=>f.id==='va-intl-339').homeScore,0);
 assert.equal(data.fixtures.filter(f=>f.status==='scheduled').length,42);
 assert(data.fixtures.filter(f=>f.stage==='knockout').every(f=>f.home===null&&f.away===null&&f.homeScore===null));
 assert.equal(data.standings.find(t=>t.id==='ITA').name,'Italy');assert.equal(validateInternationalSnapshot(data),data);
 const group=source.matches.schedule.matches.at(-1),final=Object.values(group)[0][0];
 final.participant_home_id=28;final.participant_home={name:'UFL Italy'};final.participant_away_id=29;final.participant_away={name:'UFL France'};final.participant_home_score=2;final.participant_away_score=1;
 const cup=normalizeInternationalCore(source.matches,source.standings);
 assert.equal(cup.totals.played,11);assert.deepEqual(cup.standings,data.standings);
});
test('wrong nations, partial scores, missing fixtures and incomplete tables fail without generating false results',()=>{
 for(const mutate of [
  s=>{s.matches.schedule.matches[0]['Round 1'][0].participant_home_id=999;},
  s=>{s.matches.schedule.matches[0]['Round 1'][0].participant_home_score=null;},
  s=>{s.matches.schedule.matches.pop();},
  s=>{s.standings.standings[0].teams[0].stats.played=99;}
 ]){
  const {source}=internationalFixtureSource();mutate(source);
  assert.throws(()=>normalizeInternationalCore(source.matches,source.standings));
 }
});
test('partial stats retain last complete set and timestamp while fresh results can still publish',async()=>{
 const fixture=internationalFixtureSource(),previous=await buildInternationalSnapshot(fixture.pageProps,null,{now:()=>time});
 const broken=async(c,p)=>{if(p==='stats/players/goals?page=2')throw Error('upstream unavailable');return fixture.pageProps(c,p);};
 const data=await buildInternationalSnapshot(broken,previous,{now:()=>time,warn:()=>{}});
 assert.equal(data.statsStatus,'stale');assert.equal(data.statsFetchedAt,time);assert.deepEqual(data.players,previous.players);assert.equal(data.totals.played,10);
 const initial=await buildInternationalSnapshot(broken,null,{now:()=>time,warn:()=>{}});
 assert.equal(initial.statsStatus,'pending');assert.equal(initial.statsFetchedAt,null);assert.deepEqual(initial.players,[]);
});
test('duplicated/missing pagination retains stats rather than publishing a partial leaderboard',async()=>{
 const fixture=internationalFixtureSource();
 const broken=async(c,p)=>{const out=await fixture.pageProps(c,p);if(p.endsWith('?page=2'))out.leaderboard.records.current_page=1;return out;};
 const data=await buildInternationalSnapshot(broken,null,{warn:()=>{}});
 assert.equal(data.statsStatus,'pending');assert.deepEqual(data.players,[]);
 assert.throws(()=>validateInternationalSnapshot({...data,competitionId:1}),/Mismatched/);
});
