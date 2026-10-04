import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../club-dashboard-preview.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../club-dashboard-preview.css',import.meta.url),'utf8');

test('Maykop preview exposes analytics and expandable match stat views',()=>{
  assert.match(page,/\['analytics','Analytics'\]/);
  assert.match(page,/data-match-view="stats"/);
  assert.match(page,/data-match-view="players"/);
  assert.match(page,/maykopAnalyticsPanel/);
  assert.match(page,/api\/club-analytics\/374656/);
  assert.match(page,/data-private-metric="\$\{key\}"/);
  assert.match(page,/Team access required/);
});

test('Maykop preview describes the permanent 20-minute archive accurately',()=>{
  assert.match(page,/checked every 20 minutes/);
  assert.match(page,/Permanent match history/);
});

test('Maykop match and analytics layouts include responsive styles',()=>{
  assert.match(css,/\.club-match-card/);
  assert.match(css,/\.analytics-grid/);
  assert.match(css,/\.analytics-private-gate/);
  assert.match(css,/@media\(max-width:760px\)/);
});
