import test from 'node:test';import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-engine.js';import {eaTenTrialSettings} from '../league-ea-ten-trial.js';import {eaTrialSettings} from '../league-ea-trial.js';import {leagueStandings} from '../league-results.js';
import {validWorkshopTeamId} from '../league-team-identity.js';
test('saved 10v10 team identities remain valid after a JSON reload',()=>{const settings=JSON.parse(JSON.stringify(eaTenTrialSettings()));assert(settings.teams.every(t=>validWorkshopTeamId(t.id,settings.trialSchedule)));assert.equal(buildLeagueSchedule(settings).fixtures.length,8);assert(validWorkshopTeamId('team-1'));assert(!validWorkshopTeamId('ten-team-9',settings.trialSchedule));assert(!validWorkshopTeamId('ten-team-1','other-league'));});
test('10v10 test has exact supplied fixtures, all eight IDs and Central kickoff times',()=>{
 const draft=buildLeagueSchedule(eaTenTrialSettings());assert.equal(draft.fixtures.length,8);assert.equal(draft.settings.teams.filter(t=>t.eaClubId).length,8);
 assert.deepEqual(draft.fixtures.map(f=>[f.home.name,f.away.name]),[['UFL Real Madrid','UFL Maykop'],['UFL Milan','UFL Timbers'],['UFL TabascoKids','UFL Night Shift'],['Palace','UFL Newell’s OB'],['UFL Maykop','UFL Milan'],['UFL Real Madrid','UFL TabascoKids'],['UFL Timbers','Palace'],['UFL Night Shift','UFL Newell’s OB']]);
 assert.equal(new Date(draft.fixtures[0].startsAt).toISOString(),'2026-10-21T02:00:00.000Z');assert.equal(new Date(draft.fixtures[4].startsAt).toISOString(),'2026-10-21T02:30:00.000Z');assert(leagueStandings(draft).every(t=>t.played===0&&t.points===0));assert.equal(buildLeagueSchedule(eaTrialSettings()).fixtures.length,10);
});
