import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';
import {eaTenTrialSettings} from '../league-suite-runtime/league-ea-ten-trial.js';
import {importVaSchedule} from '../league-suite-runtime/league-va-schedule.js';
import {backfillVaScores,reconcileHistory} from '../league-suite-runtime/league-history.js';
import {restoreAcceptedResults} from '../league-suite-runtime/league-results.js';
import {correctFixture} from '../league-suite-runtime/league-result-corrections.js';
import {projectLeague} from '../functions/_lib/league-centre.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function sample(){const base=buildLeagueSchedule(eaTenTrialSettings()),dates=[],matches=[];let id=9000;for(const round of [1,2]){const games=base.fixtures.filter(f=>f.round===round);dates.push({round_id:round,round_name:`Round ${round}`,scheduled_at:games[0].startsAt/1000});matches.push({'':games.map(f=>({id:id++,competition_season_round_id:round,participant_home:{name:f.home.name},participant_away:{name:f.away.name},participant_home_score:1,participant_away_score:0,posted_at:new Date(f.startsAt+1800000).toISOString()}))});}const props={competition:{id:3},season:{id:5},schedule:{dates,matches}};return {props,draft:importVaSchedule(base,props)};}
const options={beforeDate:'2026-10-28',now:'2026-10-28T15:00:00Z'};
test('EA-unavailable historical scores have provenance, no player stats, and survive workshop restore',()=>{
 const {draft,props}=sample(),first=draft.fixtures[0],filled=backfillVaScores(draft,props,{...options,unavailableFixtures:new Set([first.id])});
 assert.equal(filled.acceptedResults.length,1);assert.equal(filled.acceptedResults[0].appearances.length,0);assert.equal(filled.acceptedResults[0].provenance.kind,'va-score-only');
 assert.deepEqual(restoreAcceptedResults(buildLeagueSchedule(filled.settings),filled.acceptedResults).acceptedResults,filled.acceptedResults);
 const projected=projectLeague({id:'test',draft:filled});assert.equal(projected.totals.played,1);assert.equal(projected.totals.appearances,0);assert.equal(projected.players.length,0);assert.equal(projected.fixtures[0].statsStatus,'unavailable');
 assert.deepEqual(backfillVaScores(filled,props,{...options,unavailableFixtures:new Set([first.id])}).acceptedResults,filled.acceptedResults,'Backfill is idempotent');
});
test('backfill preserves existing accepted corrections, pending evidence and all saved appearances',()=>{
 const {draft,props}=sample(),f=draft.fixtures[0],saved=correctFixture(draft,f.id,{homeScore:6,awayScore:0,appearances:[],reason:'Owner selected the completed game'},{actor:'Owner'});
 saved.pendingResults=[{fixtureId:draft.fixtures[1].id,matchId:'pending'}];const before=structuredClone(saved),filled=backfillVaScores(saved,props,{...options,unavailableFixtures:new Set(draft.fixtures.map(f=>f.id))});
 assert.deepEqual(filled.acceptedResults.find(r=>r.fixtureId===f.id),before.acceptedResults[0]);assert.equal(filled.acceptedResults.some(r=>r.fixtureId===draft.fixtures[1].id),false);assert.deepEqual(saved,before);
 const report=reconcileHistory(filled,props,{now:Date.parse(options.now)});assert.equal(report.differences.length,1);assert.equal(report.differences[0].protectedManual,true);assert.equal(report.missing.length,1);
});
test('wrong seasons, unsupported evidence, future games, unposted results and bad scores never become fallbacks',()=>{
 const {draft,props}=sample(),unavailableFixtures=new Set(draft.fixtures.map(f=>f.id));
 assert.throws(()=>backfillVaScores(draft,props,{...options,unavailableFixtures:[]}),/EA-unavailable/);
 assert.throws(()=>backfillVaScores(draft,{...props,season:{id:9}},{...options,unavailableFixtures}),/Wrong historical/);
 assert.equal(backfillVaScores(draft,props,{...options,unavailableFixtures:new Set()}).acceptedResults?.length||0,0);
 assert.equal(backfillVaScores(draft,props,{...options,now:'2026-10-19T15:00:00Z',unavailableFixtures}).acceptedResults?.length||0,0);
 const records=props.schedule.matches.flatMap(g=>g['']);records.forEach(m=>m.posted_at=null);
 assert.equal(backfillVaScores(draft,props,{...options,unavailableFixtures}).acceptedResults?.length||0,0);
 records.forEach(m=>{m.posted_at='2026-10-21T02:00:00Z';m.participant_home_score=null;});
 assert.equal(backfillVaScores(draft,props,{...options,unavailableFixtures}).acceptedResults?.length||0,0);
});
test('new view inherits the main site shell and themes without introducing a palette or global header overrides',()=>{
 const html=read('league-suite-assets/league-centre.html'),site=read('index.html'),css=read('league-suite-assets/league-centre.css');
 const fragment=(s,tag)=>s.match(new RegExp(`<${tag} class="site-${tag}">[\\s\\S]*?<\\/${tag}>`))[0].replace(/\s+/g,' ');
 assert.equal(fragment(html,'header'),fragment(site,'header'));assert.equal(fragment(html,'footer'),fragment(site,'footer'));
 assert.match(html,/src="\/theme-init\.js"/);assert.match(html,/src="\/navigation-ux\.js"/);assert.match(html,/href="\/styles\.css/);
 assert.doesNotMatch(css,/--(?:navy|red|blue|sky|paper|ink|muted|white|line)\s*:|color-scheme\s*:|#[\da-f]{3,8}\b/i);
 assert.doesNotMatch(css,/\.site-header|\.main-nav|\.brand\s*[{,]/);
 assert.equal(read('league-suite-runtime/league-history.js'),read('league-suite-assets/league-history.js'));
});
