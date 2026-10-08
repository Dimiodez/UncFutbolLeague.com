import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

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

test('house dashboard exposes clean public sections without internal tracker copy',()=>{
  for(const label of ['Players','Matches','Analytics','Partnerships','Honors'])assert.match(source,new RegExp(`'${label}'`));
  assert.doesNotMatch(source,/Permanent|permanent|TEST REALM|20-minute rollout target|Tracker status/);
  assert.match(css,/\.sandy-dual-chart/);
  assert.match(css,/@media\(max-width:760px\)/);
});

test('partnerships are calculated from shared detailed match appearances',()=>{
  assert.match(source,/function sbPairData\(matches\)/);
  assert.match(source,/function sbLoadPartnerships\(root,data\)/);
  assert.match(source,/missing\.slice\(offset,offset\+4\)/);
  assert.match(source,/match=\$\{encodeURIComponent\(match\.match_id\)\}/);
  assert.match(source,/row\.matches>=2/);
  assert.match(source,/row\.defensiveMatches>=2/);
  assert.match(source,/row\.matches>=3/);
  for(const title of ['Sandcastle Architects','Lock the Cabin','Two Uncs, One Mission','Always on the Teamsheet'])assert.match(source,new RegExp(title));
});

test('club honors include month filtering and the Sandiest Bum headline award',()=>{
  assert.match(source,/function sbHonorData\(players,totalMatches\)/);
  assert.match(source,/id="house-honors-month"/);
  assert.match(source,/Sandiest Bum/);
  assert.match(source,/currentTitle=`Current \$\{officialTitle\}`/);
  assert.match(source,/King of the Mountain/);
  assert.match(source,/All-Time Summit Leader/);
  assert.match(source,/honorMark=mountains\?'KM':'SB'/);
  assert.match(source,/official \$\{officialTitle\} will be crowned when the month ends/);
  assert.match(source,/official monthly result/);
  assert.match(source,/month=\$\{encodeURIComponent\(month\)\}/);
  assert.match(source,/player with the most appearances/);
  assert.match(source,/Top Rated/);
  assert.match(source,/minimum 25% participation/);
  assert.match(source,/player=>`\$\{player\.goals\} goals in \$\{player\.apps\} appearances`/);
  assert.match(source,/player=>`\$\{player\.assists\} assists in \$\{player\.apps\} appearances`/);
  assert.doesNotMatch(source,/honors\.boot,player=>`\$\{player\.goals\} goals`,player=>`\$\{player\.assists\}/);
  assert.doesNotMatch(source,/honors\.assists,player=>`\$\{player\.assists\} assists`,player=>`\$\{player\.goals\}/);
  assert.match(source,/data-sandy-panel="honors"/);
});

test('Sandiest Bum is the monthly appearance leader and Top Rated remains separate',()=>{
  const context={};runInNewContext(`${source}\nthis.testHonorData=sbHonorData;`,context);
  const honors=context.testHonorData([
    {player_id:'small',latest_name:'Four Games',appearances:4,goals:0,assists:0,average_rating:8.5},
    {player_id:'month',latest_name:'Full Month',appearances:12,goals:4,assists:3,average_rating:7.4}
  ],27);
  assert.equal(honors.sandiest.name,'Full Month');
  assert.equal(honors.sandiest.totalMatches,27);
  assert.equal(honors.rated.name,'Full Month');
});

test('Sandy match archive keeps every result but initially windows the latest ten',()=>{
  assert.match(source,/Latest 10 are in view/);
  assert.match(source,/cards\.slice\(0,10\)/);
  assert.match(source,/sbApplyMatchWindow/);
  assert.match(css,/\.sandy-scroll-list\{max-height/);
  assert.match(css,/overflow-y:auto/);
});

test('mobile analytics stay within the viewport and keep club tabs under the site header',()=>{
  assert.match(css,/\.sandy-dashboard-preview\{[^}]*overflow-x:clip/);
  assert.match(css,/\.sandy-dashboard-preview \.analytics-match-card\{overflow:hidden\}/);
  assert.match(css,/\.sandy-dashboard-preview \.club-dashboard-tabs\{position:sticky;top:82px/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.house-pair-grid,\.house-honor-grid\{grid-template-columns:1fr\}/);
});
