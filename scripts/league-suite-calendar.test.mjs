import test from 'node:test';import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';
import {eaTrialSettings} from '../league-suite-runtime/league-ea-trial.js';
import {eaTenTrialSettings} from '../league-suite-runtime/league-ea-ten-trial.js';
import {importVaSchedule,mergeSharedTestDraft,VA_TEST_SOURCES} from '../league-suite-runtime/league-va-schedule.js';
import {activeCollectionFixtures} from '../league-suite-runtime/league-collection-window.js';
test('private suite vendored runtime opens full future VA calendar for both tests without importing scores',()=>{
 for(const settings of [eaTrialSettings(),eaTenTrialSettings()]){
  const draft=buildLeagueSchedule(settings),source=VA_TEST_SOURCES[settings.trialSchedule],dates=[],matches=[];let id=9000;
  for(const offset of [0,604800000])for(const r of [1,2]){
   const games=draft.fixtures.filter(f=>f.round===r),round_id=dates.length+1;dates.push({round_id,round_name:`Round ${round_id}`,scheduled_at:(games[0].startsAt+offset)/1000});
   matches.push({'':games.map(f=>({id:id++,competition_season_round_id:round_id,participant_home:{name:f.home.name},participant_away:{name:f.away.name},participant_home_score:9,participant_away_score:0}))});
  }
  const shared=importVaSchedule(draft,{competition:{id:source.competitionId},season:{id:source.seasonId},schedule:{dates,matches}});
  const browser=mergeSharedTestDraft(draft,shared),restored=buildLeagueSchedule(JSON.parse(JSON.stringify(browser.settings)));
  assert.equal(restored.fixtures.length,draft.fixtures.length*2);assert.equal(shared.acceptedResults.length,0);
  assert.deepEqual(restored.fixtures.slice(0,draft.fixtures.length).map(f=>f.id).sort(),draft.fixtures.map(f=>f.id).sort());
  assert.equal(activeCollectionFixtures(restored,restored.nights[1].fixtures[0].startsAt-15*60000).length,draft.fixtures.length);
 }
});
