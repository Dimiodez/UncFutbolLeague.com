import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {syncPickemMatchesFromAsset} from '../functions/_lib/pickems.js';
import {onRequestPost,onRequestGet} from '../functions/api/pickems/ballot.js';
import {internationalPickemSeason} from '../functions/_lib/international-pickems.js';
import {internationalFixtures} from '../functions/_lib/internationals.js';
import {INITIAL_NATIONS} from '../functions/_lib/internationals-rosters.js';
import {onRequestGet as internationalFeed} from '../functions/api/pickems/internationals.js';
import {onRequestGet as leaderboard} from '../functions/api/pickems/leaderboard.js';
import {sha256} from '../functions/_lib/auth.js';
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
async function setup(){
 const db=new DatabaseSync(':memory:');
 for(const file of ['0001_auth.sql','0002_pickems.sql','0007_pickem_competitions.sql'])db.exec(read(`migrations/${file}`));
 db.prepare("INSERT INTO users(discord_id,username,display_name) VALUES('qa','qa','QA')").run();
 db.prepare("INSERT INTO sessions(id_hash,discord_id,expires_at) VALUES(?,'qa','2099-01-01')").run(await sha256('test-session'));
 const season=JSON.parse(read('pickems-app/seasons/s2-10v10.json'));
 for(const day of season.weeks){day.scheduledAt=Math.floor(Date.now()/1000)+3600*day.week;for(const match of day.matches){match[3]=null;match[4]=null;match[5]=day.scheduledAt;}}
 const env={DB:{prepare(sql){return{sql,params:[],bind(...params){this.params=params;return this;},async run(){return{meta:db.prepare(sql).run(...this.params)};},async all(){return{results:db.prepare(sql).all(...this.params)};},async first(){return db.prepare(sql).get(...this.params);}};},async batch(statements){db.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(/^\s*(SELECT|PRAGMA)/i.test(s.sql)?await s.all():await s.run());db.exec('COMMIT');return rows;}catch(e){db.exec('ROLLBACK');throw e;}}},ASSETS:{async fetch(){return Response.json(season);}}};
 return{db,env,season};
}
const request=body=>new Request('https://www.uncfutbolleague.com/api/pickems/ballot',{method:'POST',headers:{origin:'https://www.uncfutbolleague.com',cookie:'__Host-ufl_session=test-session','content-type':'application/json'},body:JSON.stringify(body)});
test('both rounds share a ballot and lock, while archived rows and picks remain intact',async()=>{
 const {db,env,season}=await setup();
 db.prepare("INSERT INTO picks(discord_id,match_id,choice) VALUES('qa',77,'home')").run();
 const archive=db.prepare("SELECT * FROM pickem_matches WHERE competition_key='s1-6v6'").all();
 await syncPickemMatchesFromAsset(request({}),env,'s2-10v10');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM pickem_matches WHERE competition_key='s2-10v10'").get().n,season.weeks.flatMap(w=>w.matches).length);
 assert.deepEqual(db.prepare("SELECT * FROM pickem_matches WHERE competition_key='s1-6v6'").all(),archive);
 const first=db.prepare("SELECT * FROM pickem_matches WHERE competition_key='s2-10v10' AND week=1").all();
 assert.equal(first.length,season.weeks[0].matches.length);assert.equal(new Set(first.map(m=>m.scheduled_at)).size,1);
 const ballot={competition:'s2-10v10',week:1,picks:Object.fromEntries(first.map(m=>[m.id,'home'])),tiebreaker:3};
 assert.equal((await onRequestPost({request:request(ballot),env})).status,200);
 assert.equal(db.prepare("SELECT COUNT(*) n FROM picks").get().n,first.length+1);
 assert.equal((await onRequestPost({request:request({...ballot,picks:{...ballot.picks,999999:'home'}}),env})).status,400);
 // Round two cannot reopen the ballot after the first round starts.
 season.weeks[0].scheduledAt=Math.floor(Date.now()/1000)-1;
 assert.equal((await onRequestPost({request:request(ballot),env})).status,409);
 assert.equal(db.prepare("SELECT choice FROM picks WHERE match_id=77").get().choice,'home');
});
test('schedule team links use stable club identities and preserve current BYEs',()=>{
 const app=read('app.js'),context=vm.createContext({window:{},URLSearchParams,console});
 vm.runInContext(read('pickems-app/season-data.js'),context);
 vm.runInContext(app.slice(0,app.indexOf('function homePage()'))+read('league-season2.js')+read('player-portraits.js')+read('league-pages.js')+app.slice(app.indexOf('function defaultScheduleWeek('),app.indexOf('function communityEventsPage(')),context);
 const html=vm.runInContext("schedulesPage(new URLSearchParams('season=2&type=10v10&matchday=all'))",context);
 assert.match(html,/clubs\/club-1790120967830\?season=2&division=10v10/);
 const season=JSON.parse(read('pickems-app/seasons/s2-10v10.json'));
 assert.equal((html.match(/No match this round/g)||[]).length,2*season.weeks.flatMap(w=>w.byes||[]).length);
 assert.match(html,/10:00 PM EDT/);assert.match(html,/10:30 PM EDT/);
 assert.match(html,/Matchday 7/);
});

test('current official ballots save and reload despite retired schedule rows, without deleting history',async()=>{
 const {db,env,season}=await setup(),week=season.weeks[0];
 await syncPickemMatchesFromAsset(request({}),env,'s2-10v10');
 db.prepare("INSERT INTO pickem_matches(id,week,scheduled_at,home_key,away_key,competition_key) VALUES(999999,1,?,'old-home','old-away','s2-10v10')").run(week.scheduledAt);
 db.prepare("INSERT INTO picks(discord_id,match_id,choice) VALUES('qa',999999,'away')").run();
 const picks=Object.fromEntries(week.matches.map(([id],i)=>[String(id),i%2?'draw':'home']));
 const body={competition:'s2-10v10',week:1,picks,tiebreaker:4};
 const saved=await onRequestPost({request:request(body),env});
 assert.equal(saved.status,200);assert.equal((await saved.json()).ok,true);
 const get=new Request('https://www.uncfutbolleague.com/api/pickems/ballot?competition=s2-10v10&week=1',{headers:{cookie:'__Host-ufl_session=test-session'}});
 let restored=await onRequestGet({request:get,env});assert.equal(restored.status,200);assert.deepEqual(await restored.json(),{picks,tiebreaker:4});
 assert.equal(db.prepare('SELECT choice FROM picks WHERE match_id=999999').get().choice,'away');
 const revised={...picks,[String(week.matches[0][0])]:'away'};
 assert.equal((await onRequestPost({request:request({...body,picks:revised,tiebreaker:8}),env})).status,200);
 restored=await onRequestGet({request:get,env});assert.deepEqual(await restored.json(),{picks:revised,tiebreaker:8});
});
test('unavailable official ballot fails closed without writing predictions',async()=>{
 const {db,env}=await setup();env.ASSETS.fetch=async()=>new Response('',{status:503});
 const response=await onRequestPost({request:request({competition:'s2-10v10',week:1,picks:{},tiebreaker:3}),env});
 assert.equal(response.status,503);assert.equal(db.prepare('SELECT COUNT(*) n FROM picks').get().n,0);
});

test('International Pick’ems use the published schedule, excluding unassigned knockout fixtures', () => {
 const fixtures = internationalFixtures(INITIAL_NATIONS, [{
  id: 'va-intl-339', startsAt: Date.parse('2026-11-11T00:00:00Z'),
  home: {id:'USA'}, away: {id:'BRA'}, homeScore: 2, awayScore: 1,
 }]);
 const windows = [...read('migrations/20261106_internationals_dates.sql').matchAll(/VALUES\('intl-date-(\d{4}-\d{2}-\d{2})'/g)];
 const schedule = internationalPickemSeason({teams: INITIAL_NATIONS, standings: [], fixtures, windows});
 assert.equal(schedule.calendarDates, 18);
 assert.deepEqual(schedule.weeks.map(day => day.matches.length), [10,10,10,10,5]);
 const openingWeek = schedule.weeks.slice(0, 2);
 assert.deepEqual(openingWeek.map(day => day.rounds.map(row => row.round)), [[1,2],[3,4]]);
 assert.equal(openingWeek[1].scheduledAt, Date.parse('2026-11-13T00:00:00Z') / 1000);
 const openingFixtures = openingWeek.flatMap(day => day.matches);
 for (const {id} of INITIAL_NATIONS) {
  assert.equal(openingFixtures.filter(([,home,away]) => home === id || away === id).length, 4);
 }
 const first = schedule.weeks[0];
 assert.deepEqual(first.rounds.map(row => row.round), [1,2]);
 assert.equal(first.scheduledAt, Date.parse('2026-11-11T00:00:00Z') / 1000);
 assert.deepEqual(first.matches[0], [1000000339,'USA','BRA',2,1,first.scheduledAt,1,339]);
});

test('International ballots save and reload independently and lock at round one', async () => {
 const {db, env} = await setup();
 const prepare = env.DB.prepare;
 let now = Date.parse('2026-11-10T23:55:00Z') / 1000;
 env.DB.prepare = sql => {
  if (sql.includes('FROM international_competitions')) return {bind: () => ({first: async () => ({})})};
  if (sql.includes('FROM international_teams')) return {bind: () => ({all: async () => ({results: INITIAL_NATIONS})})};
  if (sql.includes('FROM international_')) return {bind: () => ({all: async () => ({results: []})})};
  return prepare(sql.replace('scheduled_at > unixepoch()', 'scheduled_at > ' + now));
 };
 db.prepare("INSERT INTO picks(discord_id,match_id,choice) VALUES('qa',77,'away')").run();
 const response = await internationalFeed({env});
 assert.equal(response.status, 200);
 const schedule = await response.json(), day = schedule.weeks[0];
 const picks = Object.fromEntries(day.matches.map(([id]) => [id, 'draw']));
 const ballot = {competition:'s1-internationals',week:1,picks,tiebreaker:4};
 assert.equal((await onRequestPost({request:request(ballot),env})).status, 200);
 const get = new Request('https://www.uncfutbolleague.com/api/pickems/ballot?competition=s1-internationals&week=1',
  {headers:{cookie:'__Host-ufl_session=test-session'}});
 assert.deepEqual(await (await onRequestGet({request:get,env})).json(), {picks,tiebreaker:4});
 db.prepare("UPDATE picks SET created_at=datetime(?, 'unixepoch') WHERE match_id > 1000000000").run(now);
 const board = await leaderboard({request:new Request('https://www.uncfutbolleague.com/api/pickems/leaderboard?competition=s1-internationals&week=1'),env});
 assert.equal(board.status,200);
 const results = await board.json();
 assert.equal(results.entries[0].picksMade,10);
 assert.equal(results.entries[0].scoredMatches,0);
 now = day.scheduledAt + 1;
 assert.equal((await onRequestPost({request:request(ballot),env})).status,409);
 assert.equal(db.prepare('SELECT choice FROM picks WHERE match_id=77').get().choice,'away');
 db.close();
});

test('Pick’ems switches between International and domestic competition controls', () => {
 const control = dataset => ({dataset, classList:{toggle(){}}, setAttribute(name, value){this[name]=value;}});
 const seasons = [control({pickemSeason:'2'}),control({pickemSeason:'1'})];
 const divisions = [control({pickemDivision:'6v6'}),control({pickemDivision:'10v10'})];
 const international = control({}), divisionSwitch = {};
 const controls = {
  '[data-pickem-season]': seasons, '[data-pickem-division]': divisions,
  '[data-pickem-internationals]': [international], '.competition-division-switch': [divisionSwitch],
 };
 const document = {querySelectorAll: selector => controls[selector], querySelector: selector => controls[selector][0]};
 const app = read('pickems-app/app.js');
 const context = vm.createContext({document,window:{UFL_SEASONS:{}}});
 vm.runInContext(app.slice(0, app.indexOf('const rosters =')) +
  "let leaderboardEntries=[]; selectCompetition('s1-internationals');", context);
 assert.equal(international['aria-pressed'], 'true');
 assert.equal(divisionSwitch.hidden, true);
 assert.deepEqual(seasons.map(button => button['aria-pressed']), ['false','false']);
 vm.runInContext("selectCompetition('s2-10v10');", context);
 assert.equal(international['aria-pressed'], 'false');
 assert.equal(divisionSwitch.hidden, false);
 assert.deepEqual(divisions.map(button => button['aria-pressed']), ['false','true']);
});

test('Pick’ems renders International and domestic leaderboard controls', () => {
 const control = scope => ({dataset:{leaderScope:scope},classList:{toggle(){}}});
 const buttons = [control('weekly'), control('season')], title = {}, activity = {};
 const source = read('pickems-app/app.js');
 const nodes = {'#pickem-leader-title':title,'#activity':activity,'[data-leader-scope]':buttons};
 const state = {competition:'s1-internationals',simpleWeek:1,simplePeriod:'weekly'};
 const render = vm.runInNewContext(
  "const $=selector=>Array.isArray(nodes[selector]) ? nodes[selector][0] : nodes[selector], $$=selector=>nodes[selector], internationalKey='s1-internationals', leaderboardEntries=[];" +
  source.slice(source.indexOf('function renderActivity()'), source.indexOf('async function loadAuth()')) + 'renderActivity;',
  {nodes,state});
 render();
 assert.equal(title.textContent, 'Match night 1 leaders');
 assert.deepEqual(buttons.map(button => button.textContent), ['Match night','Cup']);
 assert.match(activity.innerHTML, /No scored community ballots yet/);
 state.competition = 's2-10v10';
 render();
 assert.equal(title.textContent, 'Week 1 leaders');
 assert.deepEqual(buttons.map(button => button.textContent), ['Weekly','Season']);
});
