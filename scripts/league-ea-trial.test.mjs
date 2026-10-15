import test from 'node:test';
import assert from 'node:assert/strict';
import {eaTrialSettings} from '../league-ea-trial.js';
import {buildLeagueSchedule,fixtureCandidates} from '../league-engine.js';
import {acceptFixtureResult,restoreAcceptedResults,leagueStandings,acceptedAppearances} from '../league-results.js';
test('real ten-team trial has exact two rounds and only five supplied IDs',()=>{
 const d=buildLeagueSchedule(eaTrialSettings());
 assert.equal(d.settings.teams.length,10);assert.equal(d.settings.teams.filter(t=>t.eaClubId).length,5);assert.equal(d.fixtures.length,10);assert.equal(d.nights.length,1);
 assert.equal(d.fixtures[4].home.name,'UFL LAFC');assert.equal(d.fixtures[4].away.name,'UFL Roma');assert.equal(new Date(d.fixtures[4].startsAt).toISOString(),'2026-10-16T02:00:00.000Z');
 assert.equal(d.fixtures[5].home.name,'UFL Toluca');assert.equal(d.fixtures[5].away.name,'UFL Bayern');assert.equal(new Date(d.fixtures[5].startsAt).toISOString(),'2026-10-16T02:30:00.000Z');
 for(const t of d.settings.teams)assert.equal(d.fixtures.filter(f=>[f.home.id,f.away.id].includes(t.id)).length,2);
 assert.equal(d.fixtures.filter(f=>f.home.eaClubId&&f.away.eaClubId).length,2);
 assert(leagueStandings(d).every(t=>t.played===0&&t.points===0));assert.equal(acceptedAppearances(d).length,0);
});
test('scheduled EA result updates trial once and survives restored exact fixtures',()=>{
 let d=buildLeagueSchedule({...eaTrialSettings(),scoringMode:'noDraws'}),f=d.fixtures[4];const game={matchId:'1001',timestamp:(f.startsAt+15*60000)/1000,clubs:{[f.home.eaClubId]:{goals:'2'},[f.away.eaClubId]:{goals:'1'}},players:{[f.home.eaClubId]:{'p1':{playername:'Test player',goals:'2',assists:'0',rating:'8.2'}}}};
 assert.equal(fixtureCandidates(f,[{...game,timestamp:game.timestamp-86400}],{}).candidates.length,0);
 d=acceptFixtureResult(d,f.id,game,'extraTime');assert.equal(leagueStandings(d).find(t=>t.id===f.home.id).points,2);assert.equal(leagueStandings(d).find(t=>t.id===f.away.id).points,1);assert.equal(acceptedAppearances(d)[0].goals,2);
 assert.throws(()=>acceptFixtureResult(d,f.id,game,'regular'));
 const restored=restoreAcceptedResults(buildLeagueSchedule(d.settings),d.acceptedResults);assert.deepEqual(restored.acceptedResults,d.acceptedResults);
});
