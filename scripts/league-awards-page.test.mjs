import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const seasons=Object.fromEntries(['s1-6v6','s2-6v6','s2-10v10'].map(key=>[key,JSON.parse(fs.readFileSync(new URL(`pickems-app/seasons/${key}.json`,root)))]));
const options=[{id:'2',label:'Season 2',game:'FC27',divisions:{'6v6':'s2-6v6','10v10':'s2-10v10'}},{id:'1',label:'Season 1',game:'FC26',divisions:{'6v6':'s1-6v6'}}];
const context={window:{},Intl,URL,URLSearchParams,location:{origin:'https://www.uncfutbolleague.com'},selectedLeagueSeason:p=>options.find(s=>s.id===p.get('season'))||options[0],leagueSeasonOptions:options,leagueSeasonFor:(d,s)=>seasons[options.find(o=>o.id===s)?.divisions[d]],pageHero:(a,b,c)=>`<h1>${b}</h1><p>${c}</p>`};
vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('league-awards-page.js',root),'utf8'),context);
const {page,gameweeks}=context.window.UFLAwards;
test('official 6v6 gameweek contains both rounds and all ten fixtures',()=>{
 const days=gameweeks(seasons['s2-6v6']);assert.equal(days.length,9);assert.equal(days[0].fixtureCount,10);assert.equal(days[0].roundCount,2);assert.equal(days[0].date,'2026-10-15');
});
test('two raw rounds on one date merge; next date is a new gameweek regardless of weekday',()=>{
 const days=gameweeks({weeks:[{week:1,scheduledAt:1792116000,matches:[[1,'a','b',null,null,1792116000,1]]},{week:2,scheduledAt:1792117800,matches:[[2,'c','d',null,null,1792117800,2]]},{week:3,scheduledAt:1792548000,matches:[[3,'a','d',null,null,1792548000,3]]}]});
 assert.equal(days.length,2);assert.equal(days[0].fixtureCount,2);assert.equal(days[0].roundCount,2);assert.equal(days[1].number,2);
});
test('public landing has same-gameweek divisions, no draft data or publication controls',()=>{
 const html=page(new URLSearchParams('season=2&week=2'));
 assert.match(html,/Gameweek 2/);assert.match(html,/6v6 · Season 2/);assert.match(html,/10v10 · Season 2/);assert.equal((html.match(/Not announced yet/g)||[]).length,2);
 assert.match(html,/Thu, Oct 22, 2026/);assert.doesNotMatch(html,/Gameweek 18|Publish lineup|Save draft/);
});
test('season view, unavailable historical division and malformed query are safe',()=>{
 const season=page(new URLSearchParams('season=1&award=tots'));assert.match(season,/Not contested/);assert.doesNotMatch(season,/aria-label="Award gameweek"/);
 const bad=page(new URLSearchParams('week=-1&season=<script>&award=garbage'));assert.match(bad,/Gameweek 1/);assert.doesNotMatch(bad,/<script>/);
});
test('Coaching moved to Utility and awards replace its League menu position',()=>{
 const html=fs.readFileSync(new URL('index.html',root),'utf8');
 const utility=html.split('data-nav-hub="utility"')[1].split('data-nav-hub="fun"')[0];
 const league=html.split('data-nav-hub="league"')[1].split('nav-actions')[0];
 assert.match(utility,/href="\/coaching"/);assert.doesNotMatch(league,/href="\/coaching"/);assert.match(league,/href="\/totw"/);
});
test('VA source links are exact division and UFL season mappings, not fabricated per-week or TOTS URLs',()=>{
 const html=page(new URLSearchParams('season=2&week=2'));
 assert.match(html,/https:\/\/ufl.virtualarena.app\/competitions\/1\/seasons\/2\/squads/);
 assert.match(html,/https:\/\/ufl.virtualarena.app\/competitions\/3\/seasons\/5\/squads/);
 assert.equal((html.match(/Open VA TOTW archive/g)||[]).length,2);
 assert.doesNotMatch(page(new URLSearchParams('season=1')),/Open VA TOTW archive/);
 assert.doesNotMatch(page(new URLSearchParams('season=2&award=tots')),/Open VA TOTW archive/);
});
