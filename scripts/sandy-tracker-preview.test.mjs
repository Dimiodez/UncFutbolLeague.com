import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../sandy-dashboard-preview.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../sandy-dashboard-preview.css',import.meta.url),'utf8');

test('Sandy Bums test route loads the isolated permanent tracker dashboard',()=>{
  assert.match(app,/path === '\/test\/sandy-bums'/);
  assert.match(app,/bindSandyTrackerPreview/);
  assert.match(html,/sandy-dashboard-preview\.js/);
  assert.match(html,/sandy-dashboard-preview\.css/);
});

test('Sandy dashboard reads the existing archive and preserves match drilldowns',()=>{
  assert.match(source,/fetch\('\/api\/house-clubs\/fc-sandy-bums\?month=all&details=2'\)/);
  assert.match(source,/data-match-id/);
  assert.match(source,/data-sandy-match-view="stats"/);
  assert.match(source,/data-sandy-match-view="players"/);
  assert.match(source,/match-ID dedupe/);
});

test('Sandy dashboard exposes players, analytics, tracker status and responsive styling',()=>{
  for(const label of ['Players','Matches','Analytics','Tracker'])assert.match(source,new RegExp(`'${label}'`));
  assert.match(source,/20-minute rollout target/);
  assert.match(css,/\.sandy-dual-chart/);
  assert.match(css,/@media\(max-width:760px\)/);
});
