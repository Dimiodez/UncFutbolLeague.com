// Only prepares the owner-confirmed Hockey Soon merge. Apply once after review.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {rosterSnapshot} from '../functions/_lib/league-rosters.js';
import {mergeConflict,mergeStatements} from '../functions/_lib/player-merges.js';
const query=sql=>JSON.parse(execFileSync(process.execPath,['../ufb-bot/node_modules/wrangler/bin/wrangler.js','d1','execute','ufl-production','--remote','--command',sql,'--json'],{encoding:'utf8'}))[0].results;
const env={DB:{prepare(sql){return {async all(){return {results:query(sql)};}};}}};
const {people}=await rosterSnapshot(env),keep=people.find(p=>p.id==='1790190860064-579'),source=people.find(p=>p.id==='1790122602942');
if(!keep||!source||keep.name!=='Hockey Soon'||source.name!=='Hockey Soon')throw new Error('Hockey Soon records changed or already merged; stop.');
const conflict=mergeConflict(keep,source);if(conflict)throw new Error(conflict);
const portraits=query("SELECT identity_id,portrait_key,submission_id,approved_by,approved_at FROM player_photo_publications WHERE identity_id IN ('1790190860064-579','1790122602942')");
if(new Set(portraits.map(p=>p.portrait_key)).size>1)throw new Error('Two approved portraits need a choice first.');
const statements=mergeStatements({DB:{prepare(sql){return {bind(...values){return {sql,values};}};}}},keep.id,source.id,null,{keep,source,portraits,reason:'Owner-confirmed Hockey Soon duplicate; 2026-10-03'});
const literal=v=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
const sql=statements.map(s=>{let index=0;return s.sql.replace(/\?/g,()=>literal(s.values[index++]))+';';}).join('\n');
writeFileSync('migrations/0014_hockey_soon_merge.sql','-- Apply once only; subsequent runs must not resurrect released assignments.\n'+sql+'\n');
console.log('Prepared Hockey Soon merge with both league memberships and recovery metadata.');
