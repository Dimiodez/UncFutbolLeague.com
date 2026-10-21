// Produces a revision-guarded, preview-only SQL correction from a saved read-only snapshot.
// Does not execute SQL. Keep snapshots/generated SQL in the ignored .edge-sound-qa folder.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-engine.js';
import {acceptFixtureResult,restoreAcceptedResults,leagueStandings} from '../league-results.js';
import {correctFixture} from '../league-result-corrections.js';
import {importAutomaticTrial} from '../league-ea-auto.js';
const snapshot=JSON.parse(await readFile(process.argv[2],'utf8'));
const row=snapshot.leagues.find(l=>l.id==='ufl-10v10-20261020');
if(!row||!Number.isInteger(row.revision))throw Error('Missing versioned 10v10 snapshot.');
let draft=restoreAcceptedResults(buildLeagueSchedule(row.draft.settings),row.draft.acceptedResults);
const before=JSON.parse(JSON.stringify(draft.acceptedResults)),now=new Date().toISOString();
const confirmations=[
 ['ea-ten-r1-4','122706155540487',3,0,'Owner confirmed Palace–Newell’s was not the quit game. Archived 3–0 accepted after review.'],
 ['ea-ten-r2-1','122728195700265',0,0,'Owner confirmed Maykop–Milan ended 0–0, followed by a quit. EA synthetic 3–0 retained as original, not the league score.'],
 ['ea-ten-r2-2','122560532610097',6,0,'Owner confirmed Real Madrid–TabascoKids 6–0 as the official completed match. Earlier 3–0 restart record excluded.'],
 ['ea-ten-r2-3','122694253420366',3,0,'Owner confirmed Timbers–Palace was not the quit game. Archived 3–0 accepted after review.']
];
for(const [fixtureId,matchId,homeScore,awayScore,reason] of confirmations){
 if(draft.acceptedResults.some(r=>r.fixtureId===fixtureId))throw Error('Fixture already accepted; refresh snapshot instead of replacing it.');
 const game=snapshot.games.find(g=>String(g.matchId)===matchId);if(!game)throw Error('Missing archived EA evidence.');
 draft=acceptFixtureResult(draft,fixtureId,game,'standard');
 draft=correctFixture(draft,fixtureId,{homeScore,awayScore,reason,statsReview:fixtureId==='ea-ten-r2-1'},{actor:'Owner confirmation · October 21',now});
}
assert.equal(draft.acceptedResults.length,8);
for(const original of before)assert.deepEqual(draft.acceptedResults.find(r=>r.fixtureId===original.fixtureId),original);
assert.deepEqual(restoreAcceptedResults(buildLeagueSchedule(draft.settings),draft.acceptedResults).acceptedResults,draft.acceptedResults);
assert.deepEqual(importAutomaticTrial(draft,snapshot.games).draft.acceptedResults,draft.acceptedResults);
assert(leagueStandings(draft).every(t=>t.played===2));
const expected={'UFL Maykop':4,'UFL Newell’s OB':3,'UFL Milan':4,'UFL Real Madrid':3,'UFL Timbers':3,'Palace':3,'UFL Night Shift':3,'UFL TabascoKids':0};
for(const team of leagueStandings(draft))assert.equal(team.points,expected[team.name]);
const q=v=>"'"+String(v).replaceAll("'","''")+"'",id=q(row.id),guard=`id=${id} AND revision=${row.revision}`;
const sql=[`INSERT INTO preview_result_audit(league_id,fixture_id,actor,reason,before_json,after_json) SELECT id,NULL,'Owner confirmation · October 21','Backup before completing the eight confirmed October 20 fixtures',draft_json,NULL FROM preview_league_results WHERE ${guard};`];
for(const [fixtureId] of confirmations){const result=draft.acceptedResults.find(r=>r.fixtureId===fixtureId);sql.push(`INSERT INTO preview_result_audit(league_id,fixture_id,actor,reason,before_json,after_json) SELECT id,${q(fixtureId)},${q(result.correction.actor)},${q(result.correction.reason)},'null',NULL FROM preview_league_results WHERE ${guard};`);}
const additions=confirmations.map(([fixtureId])=>`'$.acceptedResults[#]',json(${q(JSON.stringify(draft.acceptedResults.find(r=>r.fixtureId===fixtureId)))})`);
sql.push(`UPDATE preview_league_results SET draft_json=json_insert(draft_json,${additions.join(',')}),revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE ${guard};`);
const text=sql.join('\n');
if(process.argv[3]!==undefined)console.log(JSON.stringify(text.slice(Number(process.argv[3])*18000,(Number(process.argv[3])+1)*18000)));
else console.log(JSON.stringify({sqlLength:text.length,results:8,appearances:draft.acceptedResults.reduce((n,r)=>n+r.appearances.length,0),standings:leagueStandings(draft).map(t=>({name:t.name,played:t.played,points:t.points,goalsFor:t.goalsFor,goalsAgainst:t.goalsAgainst}))}));
