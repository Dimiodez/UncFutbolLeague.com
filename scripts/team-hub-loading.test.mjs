import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('hub shell has essential styling and bounded logo before modules start',()=>{
 const html=read('team-hub.html');
 for(const file of ['team-hub-live.css','team-hub-sidebar.css','team-hub-ux.css','team-hub.css'])assert(html.includes('/'+file+'?v=20261013-recovery2'));
 assert(html.includes('width="48" height="48"'));
 assert(html.includes('/team-hub-loader.js?v=20261013-recovery2'));
 assert(read('team-hub-loader.js').includes('.catch('));
 assert(read('team-hub-loader.js').includes('Retry loading team hub'));
});
test('hub module graph uses a fresh consistent asset version',()=>{
 for(const file of ['team-hub.js','team-hub-comparison.js','team-tactics-model.js']){
  for(const match of read(file).matchAll(/from ['"]([^'"]+)['"]/g))assert(match[1].endsWith('?v=20261013-recovery2'),match[1]);
 }
 assert(read('_headers').replaceAll('\r','').includes('/team-hub*\n  Cache-Control: no-store, max-age=0'));
});
