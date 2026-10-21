// Calendar-only import into the isolated test database. Default is a read-only dry run.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-engine.js';
import {VA_TEST_SOURCES,fetchVaSchedule,importVaSchedule} from '../league-va-schedule.js';
import {restoreAcceptedResults} from '../league-results.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const wrangler=process.env.UFL_WRANGLER||'C:/Users/twizz/Documents/GitHub/UncWheelUnited/ufb-bot/node_modules/wrangler/bin/wrangler.js';
const apply=process.argv.includes('--apply'),quote=value=>`'${String(value).replaceAll("'","''")}'`;
function query(sql){const output=execFileSync(process.execPath,[wrangler,'d1','execute','ufl-major-update-preview','--config','collector/wrangler.toml','--remote','--command',sql,'--json'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});return JSON.parse(output);}
const rows=query('SELECT * FROM preview_league_results ORDER BY id;')[0].results;
const changes=[];
for(const row of rows){
 const saved=JSON.parse(row.draft_json),source=VA_TEST_SOURCES[saved.settings.trialSchedule];if(!source)continue;
 const original={...buildLeagueSchedule(saved.settings),acceptedResults:saved.acceptedResults||[],pendingResults:saved.pendingResults||[]};
 const props=await fetchVaSchedule(source),updated=importVaSchedule(original,props);
 restoreAcceptedResults(updated,updated.acceptedResults); // Validate every historical result against its preserved identity.
 assert.deepEqual(updated.acceptedResults,original.acceptedResults);assert.deepEqual(updated.pendingResults,original.pendingResults);
 const next={...saved,settings:updated.settings};changes.push({row,saved,next});
 const tomorrow=updated.fixtures.filter(f=>f.date==='2026-10-22');
 console.log(JSON.stringify({id:row.id,fixtures:updated.fixtures.length,nights:updated.nights.length,from:updated.nights[0].date,to:updated.nights.at(-1).date,preservedResults:updated.acceptedResults.length,linkedTeams:updated.settings.teams.filter(t=>t.eaClubId).length,tomorrow:tomorrow.map(f=>({id:f.id,round:f.round,home:f.home.name,away:f.away.name,startsAt:new Date(f.startsAt).toISOString()}))}));
}
assert.equal(changes.length,2,'Both isolated test leagues must exist.');
if(!apply){console.log('DRY RUN: no database changes.');process.exit(0);}
const backup=path.join(root,'.edge-calendar-qa');fs.mkdirSync(backup,{recursive:true});const file=path.join(backup,`before-va-calendar-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(rows,null,2));console.log('Backup: '+file);
for(const {row,next} of changes){
 const reason='Owner requested full VA fixture calendars for recurring EA-only tests; preserve every result and correction.';
 query(`INSERT INTO preview_result_audit(league_id,fixture_id,actor,reason,before_json,after_json) SELECT ${quote(row.id)},NULL,'owner-request:codex',${quote(reason)},draft_json,${quote(JSON.stringify(next))} FROM preview_league_results WHERE id=${quote(row.id)} AND revision=${row.revision}; UPDATE preview_league_results SET draft_json=${quote(JSON.stringify(next))},revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=${quote(row.id)} AND revision=${row.revision};`);
 const after=query(`SELECT draft_json FROM preview_league_results WHERE id=${quote(row.id)};`)[0].results[0];
 const confirmed=JSON.parse(after.draft_json);assert.deepEqual(confirmed.settings.vaSchedule,next.settings.vaSchedule,'Concurrent calendar change; inspect saved draft before retry.');assert.deepEqual(confirmed.acceptedResults,next.acceptedResults,'Existing results changed unexpectedly.');
 console.log(`SAVED ${row.id}: ${confirmed.settings.vaSchedule.fixtures.length} fixtures, ${confirmed.acceptedResults.length} unchanged results.`);
}
