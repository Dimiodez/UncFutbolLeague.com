import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const app=read('app.js');
const context=vm.createContext({window:{},URLSearchParams,console});
vm.runInContext(read('pickems-app/season-data.js'),context);
vm.runInContext(app.slice(0,app.indexOf('function homePage()'))+read('league-season2.js')+read('player-portraits.js')+read('league-pages.js')+read('featured-club.js'),context);
const render=(expression)=>vm.runInContext(expression,context);

test('all 16 VA registrations resolve to club pages while every current provisional team stays',()=>{
  for(const [division,count] of [['6v6',9],['10v10',7]]){
    const query=`season=2&division=${division}`;
    const view=render(`leagueViewContext(new URLSearchParams('${query}'))`);
    assert.equal(view.season.teamDetails.filter(team=>team.registered!==false).length,count);
    assert.equal(new Set(view.season.teamDetails.map(team=>team.key)).size,count);
    for(const club of view.provisional.clubs) assert.ok(view.season.teams[club.key],club.name);
    for(const key of Object.keys(view.clubAliases)){
      const html=render(`leagueClubProfile('${key}',new URLSearchParams('${query}'))`);
      assert.doesNotMatch(html,/Club not found/);
      assert.match(html,/VA registered/);
    }
  }
  assert.equal(render("leagueViewContext(new URLSearchParams('season=2&division=6v6')).players.length"),51);
  assert.equal(render("leagueViewContext(new URLSearchParams('season=2&division=10v10')).players.length"),65);
});

test('owner-confirmed Palermo rebrand keeps five players and stadium under Italia only',()=>{
  const view=render("leagueViewContext(new URLSearchParams('season=2&division=6v6'))");
  assert.equal(view.season.teams['club-1790181832909'],undefined);
  assert.equal(view.season.teams.ITA[0],'UFL Italia');
  assert.equal(view.players.filter(p=>p.club==='ITA').length,5);
  assert.equal(view.players.filter(p=>p.club==='club-1790181832909').length,0);
  const html=render("leagueClubProfile('club-1790181832909',new URLSearchParams('season=2&division=6v6'))");
  assert.match(html,/UFL Italia/);
  assert.match(html,/\/assets\/league\/club-1790181832909.jpg/);
  for(const name of ['afoe000','DTXtre-','Goose','KovacsKitchen','MiaSanMJ']) assert.ok(html.includes(name),name);
  assert.doesNotMatch(html,/UFL Palermo/);
  const allowlist=read('functions/_lib/roster-clubs.js');
  assert.doesNotMatch(allowlist,/club-1790181832909/);
  assert.match(allowlist,/"ITA"/);
});

test('linked dual-division players show both team logos without changing their rosters',()=>{
  const six=render("leaguePlayerProfile('1790183123676-110',new URLSearchParams('season=2&division=6v6'))");
  const ten=render("leaguePlayerProfile('1790179840025',new URLSearchParams('season=2&division=10v10'))");
  for(const html of [six,ten]){
    assert.match(html,/player-1790183123676-110-white-kit.png/);
    assert.match(html,/DimiOdez/);
    assert.match(html,/<figcaption>6v6<\/figcaption>/);
    assert.match(html,/<figcaption>10v10<\/figcaption>/);
    assert.equal((html.match(/<figure title=/g)||[]).length,2);
  }
  const archive=render("leaguePlayerProfile('1790040141524',new URLSearchParams('season=1&division=6v6'))");
  assert.equal((archive.match(/<figure title=/g)||[]).length,1);
  assert.doesNotMatch(archive,/<figcaption>10v10/);
});

test('portraits follow players across divisions, seasons and new membership IDs',()=>{
  assert.equal(render("playerPortraitSource({id:'future-10v10',name:'DMELLOW',portrait:false})"),'/assets/league/player-1790642010611-white-kit.png');
  assert.equal(render("playerPortraitSource({id:'future-3v3',name:'DimiOdez',portrait:'/old.jpg'})"),'/assets/league/player-1790183123676-110-white-kit.png');
  assert.equal(render("playerPortraitSource({id:'1790040141524',name:'DimiOdez',portrait:true})"),'/assets/league/player-1790183123676-110-white-kit.png');
  assert.equal(render("playerPortraitSource({id:'unrelated',name:'DMellowFan',portrait:false})"),null);
  assert.match(render("leaguePlayerProfile('1790040141524',new URLSearchParams('season=1&division=6v6'))"),/player-1790183123676-110-white-kit.png/);
  assert.match(render("leaguePlayerCard({id:'future-10v10',name:'DMellow',club:'ROM',portrait:false},leagueViewContext(new URLSearchParams('season=2&division=10v10')))"),/player-1790642010611-white-kit.png/);
});

test('weekly spotlight starts with Roma and highlights confirmed captains',()=>{
  const html=render("featuredClubSection(new Date('2026-10-02T12:00:00Z'))");
  assert.match(html,/UFL Roma/);
  assert.match(html,/>DimiOdez</);
  assert.match(html,/>Gabe</);
  assert.match(html,/DimiOdez/);
  assert.match(html,/bRzGabriel98/);
  assert.match(html,/rankings and match data pending/);
  assert.doesNotMatch(html,/#2/);
  for(const match of html.matchAll(/src="(\/assets\/league\/[^" ]+)"/g)) assert.ok(fs.existsSync(new URL(match[1].slice(1),root)),match[1]);
});

test('spotlight alternates divisions and independently exhausts each club list before repeating',()=>{
  assert.equal(render("featuredClubSelection(new Date('2026-10-04T23:59:59Z')).key"),'ROM');
  assert.notEqual(render("featuredClubSelection(new Date('2026-10-05T00:00:00Z')).key"),'ROM');
  const cycle=JSON.parse(render("JSON.stringify(Array.from({length:40},(_,i)=>featuredClubSelection(new Date(Date.parse(featuredClubConfig.startsAt)+i*604800000))))"));
  cycle.forEach((club,i)=>assert.equal(club.division,i%2?'10v10':'6v6'));
  for(const [division,size] of [['6v6',9],['10v10',7]]) {
    const clubs=cycle.filter(c=>c.division===division).map(c=>c.key);
    for(let offset=0;offset+size<=clubs.length;offset+=size) {
      assert.equal(new Set(clubs.slice(offset,offset+size)).size,size);
      assert.deepEqual(clubs.slice(offset,offset+size),clubs.slice(0,size));
    }
    assert.equal(clubs[size],clubs[0]);
  }
});
test('archived clubs have artwork and internal profiles',()=>{
  const html=render("leagueClubsPage(new URLSearchParams('season=1&division=6v6'))");
  assert.equal((html.match(/class="league-club-tile"/g)||[]).length,10);
  assert.match(html,/\/clubs\/HAM\?season=1/);
  assert.match(html,/\/assets\/league\/hamkam.jpg/);
});
test('season 2 has separate provisional rosters, not inherited archived players',()=>{
  const clubs=render("leagueClubsPage(new URLSearchParams('season=2&division=6v6'))");
  assert.match(clubs,/UFL Roma/);
  assert.doesNotMatch(clubs,/hamkam.jpg/);
  const players=render("leaguePlayersPage(new URLSearchParams('season=2'))");
  assert.equal((players.match(/class="league-player-tile"/g)||[]).length,51);
  assert.match(players,/Provisional Season 2 rosters/);
  assert.doesNotMatch(players,/1790037122937/);
  const tens=render("leaguePlayersPage(new URLSearchParams('season=2&division=10v10'))");
  assert.equal((tens.match(/class="league-player-tile"/g)||[]).length,65);
  const sixClubs=render("leagueClubsPage(new URLSearchParams('season=2&division=6v6'))");
  const tenClubs=render("leagueClubsPage(new URLSearchParams('season=2&division=10v10'))");
  // The provisional directory intentionally includes official registrations too.
  // Synced VA additions must not force us to delete temporary club previews.
  assert.equal((sixClubs.match(/class="league-club-tile"/g)||[]).length,render("Object.keys(leagueViewContext(new URLSearchParams('season=2&division=6v6')).season.teams).length"));
  assert.equal((tenClubs.match(/class="league-club-tile"/g)||[]).length,render("Object.keys(leagueViewContext(new URLSearchParams('season=2&division=10v10')).season.teams).length"));
  assert.equal((render("leagueClubProfile('ROM',new URLSearchParams('season=2'))").match(/class="league-player-tile"/g)||[]).length,6);
  assert.match(render("leaguePlayerProfile('1790183123676-110',new URLSearchParams('season=2'))"),/provisional roster/);
});
test('player filters and club profile use only reference roster',()=>{
  const html=render("leaguePlayersPage(new URLSearchParams('season=1&club=COM'))");
  assert.equal((html.match(/class="league-player-tile"/g)||[]).length,7);
  assert.match(html,/DimiOdez/);
  const profile=render("leagueClubProfile('HAM',new URLSearchParams('season=1'))");
  assert.equal((profile.match(/class="league-player-tile"/g)||[]).length,6);
});
test('new VA abbreviations retain stable provisional club keys without duplicate teams',()=>{
  const view=render("leagueViewContext(new URLSearchParams('season=2&division=10v10'))");
  assert.equal(Object.keys(view.season.teams).length,7);
  const milan=view.provisional.clubs.find(c=>c.name==='UFL Milan');
  const tabasco=view.provisional.clubs.find(c=>c.name==='UFL Tabasco Kids');
  assert.ok(view.season.teamDetails.some(t=>t.key===milan.key));
  assert.ok(view.season.teamDetails.some(t=>t.key===tabasco.key));
  assert.ok(!view.season.teams.ACM);assert.ok(!view.season.teams.TK);
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
  const html=render("['season=1','season=2&division=6v6','season=2&division=10v10'].map(q=>leagueClubsPage(new URLSearchParams(q))+leaguePlayersPage(new URLSearchParams(q))).join('')");
  for(const match of html.matchAll(/src="(\/assets\/league\/[^" ]+)"/g)) assert.ok(fs.existsSync(new URL(match[1].slice(1),root)),match[1]);
});

test('managed roster releases update club pages and free-agent profiles without altering the archive',()=>{
  render("globalThis.leagueManagedRosterState={players:{'6v6':[{id:'1790183123676-110',identity:'1790183123676-110',name:'DimiOdez',club:null}],'10v10':[{id:'1790179840025',identity:'1790183123676-110',name:'DimiOdez',club:'ROM'}]}};");
  try{
    const html=render("leaguePlayerProfile('1790183123676-110',new URLSearchParams('season=2&division=6v6'))");assert.match(html,/Free agent/);assert.doesNotMatch(html,/\/clubs\/null/);assert.match(html,/club=free-agent/);
    assert.equal(render("leagueViewContext(new URLSearchParams('season=1')).players.length"),26);
    assert.equal(render("leagueViewContext(new URLSearchParams('season=2')).players.filter(p=>p.club==='ROM').length"),0);
  }finally{render('delete globalThis.leagueManagedRosterState');}
});
