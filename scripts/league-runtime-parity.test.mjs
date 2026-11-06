import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {verifyLeagueRuntimeParity,SHARED_RESULT_MODULES} from './check-league-runtime-parity.mjs';
test('published browser result rules match the scheduled server collector',()=>{assert.equal(verifyLeagueRuntimeParity(),SHARED_RESULT_MODULES.length);});
test('publication guard rejects the old 90-minute browser matching window',()=>{
 assert.throws(()=>verifyLeagueRuntimeParity(path=>{let text=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');return path==='league-suite-assets/league-engine.js'?text.replace('afterMinutes=120','afterMinutes=90'):text;}),/server and browser: league-engine/);
});
test('publication runs shared result parity validation before creating assets',()=>{
 const source=fs.readFileSync(new URL('./build-public.mjs',import.meta.url),'utf8');
 assert(source.indexOf('verifyLeagueRuntimeParity();')<source.indexOf('fs.mkdirSync(resolved'));
});
