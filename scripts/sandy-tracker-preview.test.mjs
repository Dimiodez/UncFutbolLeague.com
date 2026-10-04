import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../sandy-dashboard-preview.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../sandy-dashboard-preview.css',import.meta.url),'utf8');

test('both live house-club routes load the public tracker dashboard',()=>{
  assert.match(app,/houseClubTrackerPage\(path\.split\('\/'\)\.pop\(\)\)/);
  assert.match(source,/'fc-sandy-bums'/);
  assert.match(source,/'fc-mountains'/);
  assert.match(app,/bindSandyTrackerPreview/);
  assert.match(html,/sandy-dashboard-preview\.js/);
  assert.match(html,/sandy-dashboard-preview\.css/);
});

test('house dashboard reads the selected club and preserves match drilldowns',()=>{
  assert.match(source,/api\/house-clubs\/\$\{sandyTrackerState\.club\.slug\}/);
  assert.match(source,/data-match-id/);
  assert.match(source,/data-sandy-match-view="stats"/);
  assert.match(source,/data-sandy-match-view="players"/);
  assert.match(source,/complete match report/);
});

test('house dashboard exposes clean public players, matches and analytics without internal tracker copy',()=>{
  for(const label of ['Players','Matches','Analytics'])assert.match(source,new RegExp(`'${label}'`));
  assert.doesNotMatch(source,/Permanent|permanent|TEST REALM|20-minute rollout target|Tracker status/);
  assert.match(css,/\.sandy-dual-chart/);
  assert.match(css,/@media\(max-width:760px\)/);
});

test('Sandy match archive keeps every result but initially windows the latest ten',()=>{
  assert.match(source,/Latest 10 are in view/);
  assert.match(source,/cards\.slice\(0,10\)/);
  assert.match(source,/sbApplyMatchWindow/);
  assert.match(css,/\.sandy-scroll-list\{max-height/);
  assert.match(css,/overflow-y:auto/);
});
