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
  assert.match(page,/data-analytics-metric="\$\{key\}"/);
});

test('Maykop preview describes the permanent 20-minute archive accurately',()=>{
  assert.match(page,/checked every 20 minutes/);
  assert.match(page,/polling is not enabled for Maykop yet/);
});

test('Maykop match and analytics layouts include responsive styles',()=>{
  assert.match(css,/\.club-match-card/);
  assert.match(css,/\.analytics-grid/);
  assert.match(css,/@media\(max-width:760px\)/);
});
