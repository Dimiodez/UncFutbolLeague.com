import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export const SHARED_RESULT_MODULES=['league-engine.js','league-collection-window.js','league-collection-policy.js','league-ea-auto.js','league-ea-candidates.js','league-pending-results.js','league-result-corrections.js','league-results.js','league-player-stats.js','league-va-schedule.js','league-shared-workspace.js'];
export function verifyLeagueRuntimeParity(read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8')){
 for(const file of SHARED_RESULT_MODULES){
  const runtime=read('league-suite-runtime/'+file),browser=read('league-suite-assets/'+file);
  if(runtime!==browser)throw Error('League result code differs between server and browser: '+file+'. Publish the same reviewed module to both paths.');
 }
 return SHARED_RESULT_MODULES.length;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){console.log('Verified shared league result modules: '+verifyLeagueRuntimeParity());}
