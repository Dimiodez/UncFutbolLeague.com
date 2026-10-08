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
  assert.match(source,/row\.defensiveMatches>=5/);
  assert.match(source,/row\.matches>=5/);
  for(const title of ['Sandcastle Architects','Lock the Cabin','Two Uncs, One Mission','Always on the Teamsheet'])assert.match(source,new RegExp(title));
});

test('attacking partnerships count team goals only in shared matches for both house clubs',()=>{
  const context={};runInNewContext(`${source}\nthis.pairs=sbPairData;this.renderPairs=sbPartnerships;this.setClub=slug=>sandyTrackerState.club=houseTrackerClubs[slug];`,context);
  for(const [slug,clubId] of [['fc-sandy-bums','43521'],['fc-mountains','96510']]){
    context.setClub(slug);
    const player=id=>({id,name:id,human:true,stats:['FWD',8,99,0,99]});
    const match=(id,gf,ga,ids)=>({match_id:id,goals_for:gf,goals_against:ga,details:{clubs:[{id:clubId,players:ids.map(player)}]}});
    const matches=[match('1',2,0,['a','b']),match('2',3,1,['a','b']),match('3',0,1,['a','b']),match('4',4,0,['a','b']),match('5',1,2,['a','b']),match('not-shared',100,0,['a'])];
    const pair=context.pairs(matches).attack;
    assert.equal(pair.teamGoals,10);assert.equal(pair.matches,5);assert.equal(pair.wins,3);
    const rendered=context.renderPairs({matches});
    assert.ok(rendered.includes('10 team goals'));
    assert.ok(rendered.includes('whole team in matches both players appeared in'));
    assert.ok(!rendered.includes(' G + A'));
    const higherTeamScore=[...matches,match('6',6,0,['c','d']),match('7',6,0,['c','d'])];
    assert.equal(context.pairs(higherTeamScore).attack.teamGoals,12,'Ranking follows team goals, not individual contributions or appearance count');
  }
});

test('rate partnerships require five qualifying appearances and incomplete history is disclosed',()=>{
 const context={};runInNewContext(`${source}\nthis.pairs=sbPairData;this.renderPairs=sbPartnerships;`,context);
 const match=(id,players)=>({match_id:id,goals_for:1,goals_against:0,details:{clubs:[{id:'43521',players:players.map(([id,pos])=>({id,name:id,stats:[pos]}))}]}});
 const four=Array.from({length:4},(_,i)=>match(String(i),[['a','DEF'],['b','GK']]));
 assert.equal(context.pairs(four).defense,null);assert.equal(context.pairs(four).winners,null);
 const five=[...four,match('5',[['a','DEF'],['b','GK']])];
 assert.equal(context.pairs(five).defense.cleanSheets,5);assert.equal(context.pairs(five).winners.wins,5);
 const roleChange=[...four,match('5',[['a','MID'],['b','GK']])];
 assert.equal(context.pairs(roleChange).defense,null,'Both players must be defensive in five matches');
 const partial=context.renderPairs({matches:[...five,{match_id:'missing',goals_for:99}]});
 assert.ok(partial.includes('Provisional rankings'));assert.ok(partial.includes('5 of 6 matches'));assert.ok(partial.includes('data-partnership-retry'));
 const full=context.renderPairs({matches:five});assert.ok(full.includes('all 5 recorded matches'));assert.ok(!full.includes('Provisional rankings'));
});

test('partnership loading keeps successes, retries failures, and stops on rate limits',async()=>{
 let mode='limited',calls=0;const listeners=[];
 const panel={innerHTML:'',querySelector:()=>({addEventListener:(type,listener)=>listeners.push(listener),setAttribute(){}})};
 const root={isConnected:true,querySelector:()=>panel};
 const detail=id=>({match_id:id,goals_for:1,goals_against:0,details:{clubs:[{id:'43521',players:[{id:'a',name:'A',stats:['DEF']},{id:'b',name:'B',stats:['GK']}]}]}});
 const data={matches:Array.from({length:9},(_,i)=>({match_id:String(i),goals_for:1,goals_against:0}))};
 const context={AbortSignal,Date,setTimeout:resolve=>resolve(),fetch:async url=>{calls++;const id=new URL(url,'https://example.com').searchParams.get('match');if(mode==='limited'&&id==='0')return {status:429,ok:false};return {status:200,ok:true,json:async()=>({matches:[detail(id)]})};}};
 runInNewContext(`${source}\nthis.load=sbLoadPartnerships;this.state=sandyTrackerState;`,context);
 context.state.data=data;
 await context.load(root,data);assert.equal(calls,4,'Stop after the first rate-limited batch');
 assert.equal(context.state.partnershipDetails.filter(m=>m.details).length,3);assert.ok(panel.innerHTML.includes('Provisional rankings'));
 await context.load(root,data);assert.equal(calls,4,'Cooldown prevents immediate repeat requests');
 context.state.partnershipRetryAt=0;mode='success';await context.load(root,data);
 assert.equal(calls,10,'Only the six still-missing matches are retried');
 assert.ok(panel.innerHTML.includes('all 9 recorded matches'));assert.ok(!panel.innerHTML.includes('Provisional rankings'));
 assert.equal(context.state.partnershipPromise,null);assert.ok(listeners.length>0);
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
