import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const app=read('app.js');
const context=vm.createContext({window:{},URLSearchParams,console});
vm.runInContext(read('pickems-app/season-data.js'),context);
vm.runInContext(app.slice(0,app.indexOf('function homePage()'))+read('league-pages.js'),context);
const render=(expression)=>vm.runInContext(expression,context);
test('archived clubs have artwork and internal profiles',()=>{
  const html=render("leagueClubsPage(new URLSearchParams('season=1&division=6v6'))");
  assert.equal((html.match(/class="league-club-tile"/g)||[]).length,10);
  assert.match(html,/\/clubs\/HAM\?season=1/);
  assert.match(html,/\/assets\/league\/hamkam.jpg/);
});
test('season 2 does not inherit archived clubs or players',()=>{
  const clubs=render("leagueClubsPage(new URLSearchParams('season=2&division=6v6'))");
  assert.match(clubs,/UFL Roma/);
  assert.doesNotMatch(clubs,/hamkam.jpg/);
  const players=render("leaguePlayersPage(new URLSearchParams('season=2'))");
  assert.doesNotMatch(players,/class="league-player-tile"/);
  assert.match(players,/registration is coming next/);
});
test('player filters and club profile use only reference roster',()=>{
  const html=render("leaguePlayersPage(new URLSearchParams('season=1&club=COM'))");
  assert.equal((html.match(/class="league-player-tile"/g)||[]).length,7);
  assert.match(html,/DimiOdez/);
  const profile=render("leagueClubProfile('HAM',new URLSearchParams('season=1'))");
  assert.equal((profile.match(/class="league-player-tile"/g)||[]).length,6);
});
test('standings preserve final totals, and stats filters show no invented results',()=>{
  const standings=render("leagueStandingsPage(new URLSearchParams('season=1'))");
  assert.match(standings,/43 points · 14 wins · 18 matches/);
  assert.match(standings,/Final table/);
  const stats=render("leagueStatsPage(new URLSearchParams('category=Defense'))");
  assert.equal((stats.match(/class="league-stat-board"/g)||[]).length,2);
  assert.match(stats,/Tackles per game/);
  assert.match(stats,/Defender clean sheets/);
});
test('every local reference image exists',()=>{
  const html=render("leagueClubsPage(new URLSearchParams('season=1'))+leaguePlayersPage(new URLSearchParams('season=1'))");
  for(const match of html.matchAll(/src="(\/assets\/league\/[^" ]+)"/g)) assert.ok(fs.existsSync(new URL(match[1].slice(1),root)),match[1]);
});
