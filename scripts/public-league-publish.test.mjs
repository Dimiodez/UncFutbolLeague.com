import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('public VA snapshot publishes on matchnights independently of private EA collection',()=>{
 const workflow=fs.readFileSync(new URL('../.github/workflows/sync-virtual-arena.yml',import.meta.url),'utf8');
 assert.match(workflow,/7,22,37,52 0-8 \* \* 3,5/);
 assert.match(workflow,/15 5,11,17,23 \* \* \*/);
 assert.match(workflow,/node scripts\/sync-virtual-arena\.mjs/);
 for(const file of ['pickems-app/season-data.js','pickems-app/seasons','pickems-app/season-data-10v10-s2.json'])assert(workflow.includes(file));
 assert.match(workflow,/git push/);
 assert(!workflow.includes('preview_league_results'),'Private EA test results must not silently replace official public VA data');
});
