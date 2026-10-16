import test from 'node:test';
import assert from 'node:assert/strict';
import {upgradeTrialClubIds,eaTrialSettings} from '../league-ea-trial.js';
test('correct known stale Arsenal link without replacing custom links or accepted results',()=>{
 const old=eaTrialSettings().teams.map(t=>t.id==='team-5'?{...t,eaClubId:'1597678'}:t);
 assert.equal(upgradeTrialClubIds(old).find(t=>t.id==='team-5').eaClubId,'1664060');
 assert.equal(upgradeTrialClubIds(old,[{fixtureId:'ea-trial-r1-3'}]).find(t=>t.id==='team-5').eaClubId,'1597678');
 const custom=old.map(t=>t.id==='team-5'?{...t,eaClubId:'999'}:t);assert.equal(upgradeTrialClubIds(custom).find(t=>t.id==='team-5').eaClubId,'999');
});
