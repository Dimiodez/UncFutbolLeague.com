import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadLeagueData,onRequestGet} from '../functions/api/league/live.js';
const root=new URL('../',import.meta.url), read=file=>fs.readFileSync(new URL(file,root),'utf8');
const page=props=>new Response(`<main data-page="${JSON.stringify({props}).replaceAll('"','&quot;')}"></main>`);
const base={competition:{id:1},season:{id:2}};
test('default upstream fetch retains the Cloudflare global receiver',async()=>{
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async function(){assert.equal(this,globalThis);return page({...base,leaderboards:{players:{}}});};
    assert.equal((await loadLeagueData('6v6','stats')).kind,'stats');
  } finally {globalThis.fetch=original;}
});
test('public VA feed strips private props and validates season before exposing standings',async()=>{
  const data=await loadLeagueData('6v6','standings',async (url,options)=>{
    assert.equal(options.redirect,'manual');
    assert.equal(url,'https://ufl.virtualarena.app/competitions/1/seasons/2/standings');
    return page({...base,auth:{secret:'private'},standings:[{name:'Club',team:{id:5},stats:{played:2,wins:2,draws:0,losses:0,goals_for:3,goals_against:0,goal_difference:3,points:6}}]});
  });
  assert.equal(data.standings[0].stats[7],6);
  assert.equal(data.auth,undefined);
  await assert.rejects(loadLeagueData('10v10','standings',async()=>page({...base,standings:[]})),/mismatch/);
  await assert.rejects(loadLeagueData('6v6','standings',async()=>page({...base,standings:[]})),/missing/);
  await assert.rejects(loadLeagueData('6v6','standings',async()=>page({...base,standings:[{name:'Club',team:{id:5},stats:{}}]})),/Incomplete/);
});
test('stats retain zero values and no-results feeds; unsafe URLs and private fields never pass through',async()=>{
  const data=await loadLeagueData('6v6','stats',async()=>page({...base,leaderboards:{players:{goals:{records:[{stat:0,played:2,data:{name:'A < B',url:'javascript:alert(1)',email:'private'},team:{name:'Club'}}]},assists:{records:[]}},private:'hidden'}}));
  assert.equal(data.leaderboards.players.goals.records[0].stat,0);
  assert.equal(data.leaderboards.players.goals.records[0].data.url,undefined);
  assert.deepEqual(data.leaderboards.players.assists.records,[]);
  assert.equal(data.leaderboards.private,undefined);
});
test('league feed rejects arbitrary origins and selectors without making an upstream request',async()=>{
  for(const query of ['division=https://evil.test&kind=stats','division=6v6&kind=users','division=house&kind=standings']){
    assert.equal((await onRequestGet({request:new Request(`https://uncfutbolleague.com/api/league/live?${query}`)})).status,400);
  }
});
test('live numbers render correctly, preserve club links, escape names and never replace archive totals',()=>{
  const context=vm.createContext({window:{},URLSearchParams,console});
  const app=read('app.js');
  vm.runInContext(read('pickems-app/season-data.js')+app.slice(0,app.indexOf('function homePage()'))+read('league-season2.js')+read('player-portraits.js')+read('league-pages.js'),context);
  const run=script=>vm.runInContext(script,context);
  const archived=run("JSON.stringify(leagueViewContext(new URLSearchParams('season=1&division=6v6')).season.standings)");
  run(`leagueLiveFeeds.set('6v6:standings',{syncedAt:'2026-10-12T12:00:00Z',standings:[{teamId:5,name:'UFL Bayern',stats:[2,2,0,0,7,1,6,6]}]});leagueLiveFeeds.set('6v6:stats',{leaderboards:{players:{goals:{records:[{data:{name:'<script>alert(1)</script>'},team:{name:'UFL Bayern'},stat:7,played:2}]}}}});`);
  const table=run("leagueStandingsPage(new URLSearchParams('season=2&division=6v6'))");
  assert.match(table,/refreshes every 5 minutes/);
  assert.match(table,/>7<\/td>/);
  const stats=run("leagueStatsPage(new URLSearchParams('season=2&division=6v6&category=Attack'))");
  assert.match(stats,/&lt;script&gt;/);
  assert.match(stats,/7<\/b>/);
  assert.match(stats,/\/clubs\/club-1790623010463\?season=2&amp;division=6v6|\/clubs\/club-1790623010463\?season=2&division=6v6/);
  assert.doesNotMatch(stats,/<script>/);
  assert.equal(run("JSON.stringify(leagueViewContext(new URLSearchParams('season=1&division=6v6')).season.standings)"),archived);
});
