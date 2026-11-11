import {INTERNATIONAL_VA_FIXTURES} from '../functions/_lib/international-va-fixtures.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {internationalData,internationalFixtures} from '../functions/_lib/internationals.js';
import {internationalContent} from '../functions/_lib/internationals-view.js';
import {internationalPage} from '../functions/_lib/internationals-page.js';
import {onRequest as api} from '../functions/api/internationals.js';
import {INITIAL_NATIONS} from '../functions/_lib/internationals-rosters.js';
const schema=fs.readFileSync(new URL('../migrations/20261106_internationals.sql',import.meta.url),'utf8'),seed=fs.readFileSync(new URL('../migrations/20261106_internationals_seed.sql',import.meta.url),'utf8');
function setup(role=null){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON;CREATE TABLE league_players(id TEXT PRIMARY KEY,discord_name TEXT,normalized_name TEXT,created_by TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);CREATE TABLE league_player_aliases(alias_id TEXT PRIMARY KEY,canonical_id TEXT);CREATE TABLE league_roster_memberships(player_id TEXT,season TEXT,division TEXT,profile_id TEXT,team_key TEXT);');
 for(const t of INITIAL_NATIONS)for(const p of t.roster)if(!p.newProfile){sqlite.prepare('INSERT INTO league_players VALUES(?,?,?,?,CURRENT_TIMESTAMP)').run(p.playerId,p.name,p.name.toLowerCase(),null);sqlite.prepare("INSERT INTO league_roster_memberships VALUES(?,'2','6v6',?,'original-club')").run(p.playerId,p.playerId);}
 sqlite.exec(schema);sqlite.exec(seed);
 const DB={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){if(sql.includes('FROM sessions'))return role?{discord_id:'staff',role,status:'active'}:null;return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...this.args).changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const values=[];for(const stmt of statements)values.push(await stmt.run());sqlite.exec('COMMIT');return values;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 return {sqlite,env:{DB,ASSETS:{fetch:async()=>new Response('<header class="site-header"><a href="/">UNC</a></header><footer class="site-footer">UFL</footer>')}}};
}
const request=(body,origin='https://www.uncfutbolleague.com')=>new Request('https://www.uncfutbolleague.com/api/internationals',{method:body?'POST':'GET',headers:{cookie:'__Host-ufl_session=test',origin,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
test('initial squads reuse fifty profiles, add ten, and seed idempotently without changing club memberships',async()=>{
 const s=setup();s.sqlite.exec(seed);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM international_teams').get().n,10);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM international_rosters').get().n,60);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM league_players').get().n,60);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM league_roster_memberships WHERE team_key=?').get('original-club').n,50);
 const data=await internationalData(s.env);assert.equal(data.fixtures.length,52);assert.equal(data.windows.length,0);assert.equal(data.players.length,0);assert.equal(data.selections.length,0);assert.equal(data.resultsPublished,false);assert.equal(data.competition.minPlayers,5);assert.equal(data.competition.maxPlayers,6);s.sqlite.close();
});
test('public readers see squads but cannot mutate them; cross-origin administrative writes fail',async()=>{
 for(const role of [null,'member']){const s=setup(role);assert.equal((await api({request:request(),env:s.env})).status,200);assert.equal((await api({request:request({action:'addRoster',teamId:'ITA',name:'Unexpected'}),env:s.env})).status,403);s.sqlite.close();}
 const s=setup('owner');assert.equal((await api({request:request({action:'addRoster',teamId:'ITA',name:'Unexpected'},'https://evil.example'),env:s.env})).status,403);s.sqlite.close();
});
test('owner can grow a squad beyond six, repeated name reuses profile, and removing membership preserves club records',async()=>{
 const s=setup('owner');for(const name of ['Seventh Player','Eighth Player'])assert.equal((await api({request:request({action:'addRoster',teamId:'ITA',name}),env:s.env})).status,200);
 assert.equal(s.sqlite.prepare("SELECT count(*) n FROM international_rosters WHERE team_id='ITA' AND active=1").get().n,8);
 assert.equal((await api({request:request({action:'addRoster',teamId:'FRA',name:'Seventh Player'}),env:s.env})).status,409);
 assert.equal(s.sqlite.prepare("SELECT count(*) n FROM league_players WHERE normalized_name='seventh player'").get().n,1);
 assert.equal((await api({request:request({action:'deactivateRoster',rosterId:'intl-ITA-1'}),env:s.env})).status,200);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM league_roster_memberships').get().n,50);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM international_roster_audit').get().n,3);s.sqlite.close();
});
test('international pages escape roster content, expose no anonymous administration, and serve valid nested routes',async()=>{
 const s=setup();const data=await internationalData(s.env);data.teams[0].roster[0].name='<img src=x onerror=alert(1)>';
 const html=internationalContent(data,'teams');assert(html.includes('&lt;img'));assert(!html.includes('<img src=x'));assert(!html.includes('id="intl-add-player"'));
 for(const section of ['overview','teams','schedules','results','standings','stats','totw'])assert(internationalContent(data,section).includes('aria-label="Internationals sections"'));
 for(const path of ['/internationals','/internationals/standings','/internationals/teams/ITA'])assert.equal((await internationalPage({request:new Request('https://site.test'+path),env:s.env})).status,200);
 for(const path of ['/internationals/unknown','/internationals/teams/ZZZ','/internationals/stats/ITA'])assert.equal((await internationalPage({request:new Request('https://site.test'+path),env:s.env})).status,404);
 s.sqlite.close();
});
test('international pages identify their section in the shared site menu', async () => {
 const {sqlite, env} = setup();
 const shell = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
 env.ASSETS.fetch = async () => new Response(shell);
 try {
  for (const [path, state] of [['/internationals','page'], ['/internationals/standings','location']]) {
   const response = await internationalPage({request:new Request('https://site.test'+path), env});
   assert.equal(response.status, 200);
   const html = await response.text();
   const header = html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0] || '';
   assert.ok(header.includes('class="nav-group nav-split-group nav-hub active" data-nav-hub="league"'));
   assert.ok(header.includes('href="/internationals" aria-current="'+state+'"'));
  }
 } finally {
  sqlite.close();
 }
});

test('published source failures are not disguised as an empty successful table',async()=>{
 const s=setup();s.sqlite.prepare("UPDATE international_competitions SET publish_results=1,shared_league_id='future-verified-source'").run();
 assert.equal((await api({request:request(),env:s.env})).status,503);s.sqlite.close();
});

test('national flags render as inline vectors rather than platform-dependent emoji',()=>{const view=internationalContent({teams:[{id:'ITA',name:'Italy',color:'#16875a',roster:[]}],totals:{played:0}},'teams');assert(view.includes('class="intl-flag-svg"'));assert(view.includes('viewBox="0 0 36 24"'));});

test('adding a known national nickname reuses its linked canonical profile instead of creating a duplicate',async()=>{
 const s=setup('owner'),id=INITIAL_NATIONS.find(t=>t.id==='ITA').roster.find(p=>p.name==='Bravo').playerId;
 s.sqlite.prepare("UPDATE league_players SET discord_name='BravoAnte',normalized_name='bravoante' WHERE id=?").run(id);
 const before=s.sqlite.prepare('SELECT count(*) n FROM league_players').get().n;
 assert.equal((await api({request:request({action:'addRoster',teamId:'FRA',name:'Bravo'}),env:s.env})).status,409);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM league_players').get().n,before);s.sqlite.close();
});

test('owner calendar dates seed idempotently without club fixtures or invented kickoff times',async()=>{
 const s=setup(),migration=fs.readFileSync(new URL('../migrations/20261106_internationals_dates.sql',import.meta.url),'utf8');
 s.sqlite.exec(migration);s.sqlite.exec(migration);
 const data=await internationalData(s.env);
 assert.deepEqual(data.windows.map(w=>w.starts_on),["2026-11-10","2026-11-12","2027-01-05","2027-01-07","2027-01-12","2027-01-14","2027-01-19","2027-01-21","2027-03-16","2027-03-18","2027-05-11","2027-05-13","2027-05-18","2027-05-20","2027-07-13","2027-07-15","2027-08-31","2027-09-02"]);
 assert(data.windows.every(w=>w.starts_on===w.ends_on));
 assert.equal(data.windows.find(w=>w.starts_on==='2027-07-15').name,'World Cup · Quarterfinals (2 legs)');
 assert.equal(data.windows.find(w=>w.starts_on==='2027-09-02').name,'World Cup · Final (2 legs)');
 assert.equal(data.fixtures.length,52);assert.equal(data.resultsPublished,false);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM league_roster_memberships').get().n,50);
 const html=internationalContent(data,'schedules');
 assert(html.includes('18 international dates'));
 assert(html.includes('Tuesday, Nov 10'));assert(html.includes('Thursday, Sep 2'));
 assert(html.includes('November 2026'));assert(html.includes('September 2027'));
 assert(!html.includes('2027-09-01'));assert(!html.includes('6v6 Matchday'));assert(!html.includes('10v10 Matchday'));
 assert(!html.includes('2026-11-03'));assert(!html.includes('Champions League'));
 s.sqlite.close();
});

test('regional divisions cover every nation exactly once and retain confirmed source standings order and totals',async()=>{
 const s=setup(),data=await internationalData(s.env);
 assert.deepEqual(data.divisions.map(d=>[d.id,d.teamIds.slice().sort()]),[
 ['europe',['ENG','ESP','FRA','GER','ITA']],['americas',['ARG','BRA','CAN','MEX','USA']]]);
 assert.equal(new Set(data.divisions.flatMap(d=>d.teamIds)).size,data.teams.length);
 assert(data.teams.every(t=>data.divisions.find(d=>d.id===t.divisionId)?.teamIds.includes(t.id)));
 data.standings=data.standings.map(r=>({...r,points:r.id==='ESP'?9:r.id==='BRA'?6:0})).sort((a,b)=>b.points-a.points);
 data.totals.played=3;
 const before=JSON.stringify(data.standings),html=internationalContent(data,'standings');
 assert.equal(JSON.stringify(data.standings),before);
 const europe=html.split('id="intl-division-europe"')[1].split('</section>')[0];
 const americas=html.split('id="intl-division-americas"')[1].split('</section>')[0];
 for(const id of ['ENG','FRA','GER','ITA','ESP']){assert(europe.includes('/teams/'+id));assert(!americas.includes('/teams/'+id));}
 for(const id of ['ARG','BRA','CAN','MEX','USA']){assert(americas.includes('/teams/'+id));assert(!europe.includes('/teams/'+id));}
 assert(europe.indexOf('/teams/ESP')<europe.indexOf('/teams/ENG'));assert(americas.indexOf('/teams/BRA')<americas.indexOf('/teams/ARG'));
 assert(europe.includes('<td>9</td>'));assert(americas.includes('<td>6</td>'));s.sqlite.close();
});
test('calendar month shortcuts preserve exact dates and two-leg stage labels in the compact agenda',async()=>{
 const s=setup();s.sqlite.exec(fs.readFileSync(new URL('../migrations/20261106_internationals_dates.sql',import.meta.url),'utf8'));
 const html=internationalContent(await internationalData(s.env),'schedules');
 assert(html.includes('aria-label="Jump to a schedule month"'));
 for(const month of ['2026-11','2027-01','2027-03','2027-05','2027-07','2027-08','2027-09']){assert(html.includes('href="#intl-month-'+month+'"'));assert(html.includes('id="intl-month-'+month+'"'));}
 assert.equal((html.match(/class="intl-agenda-event"/g)||[]).length,18);
 assert.equal((html.match(/class="intl-stage-tag">2 legs/g)||[]).length,3);
 assert(html.includes('Quarterfinals'));assert(html.includes('Semifinals'));assert(html.includes('Final'));
 assert(html.includes('1 date</span>'));s.sqlite.close();
});

test('VA schedule contains a complete single round robin and seven unassigned knockout slots',async()=>{
 const s=setup(),data=await internationalData(s.env),league=data.fixtures.filter(f=>f.stage==='league'),knockouts=data.fixtures.filter(f=>f.stage==='knockout');
 assert.equal(league.length,45);assert.equal(knockouts.length,7);
 assert.equal(new Set(league.map(f=>[f.home.id,f.away.id].sort().join('/'))).size,45);
 for(const t of data.teams)assert.equal(league.filter(f=>[f.home.id,f.away.id].includes(t.id)).length,9);
 assert(knockouts.every(f=>f.home===null&&f.away===null));
 assert(data.fixtures.every(f=>f.status==='scheduled'&&f.homeScore===null&&f.awayScore===null));
 assert.equal(data.source.url,'https://ufl.virtualarena.app/competitions/4/seasons/6');
 assert.equal(data.resultsPublished,false);assert(data.standings.every(r=>r.points===0&&r.played===0));
 s.sqlite.close();
});
test('official kickoff instants render on the correct Central calendar day with 6 PM and 6:30 PM slots',async()=>{
 const s=setup();s.sqlite.exec(fs.readFileSync(new URL('../migrations/20261106_internationals_dates.sql',import.meta.url),'utf8'));
 const data=await internationalData(s.env),html=internationalContent(data,'schedules');
 const november=html.split('id="intl-month-2026-11"')[1].split('id="intl-month-2027-01"')[0];
 assert(november.includes('6:00 PM CST'));assert(november.includes('6:30 PM CST'));
 assert(november.includes('USA'));assert(november.includes('Brazil'));
 assert.equal((november.match(/View 10 fixtures/g)||[]).length,2);
 assert.equal((html.match(/class="intl-date-fixtures"/g)||[]).length,6);
 assert(html.includes('Quarter Finals'));assert(html.includes('To be confirmed'));s.sqlite.close();
});
test('overall and regional standings show the same approved result values, while cup fixtures cannot enter league projection',async()=>{
 const s=setup(),data=await internationalData(s.env);data.standings.find(r=>r.id==='USA').points=3;
 const html=internationalContent(data,'standings'),overall=html.split('id="intl-division-overall"')[1].split('</section>')[0],americas=html.split('id="intl-division-americas"')[1].split('</section>')[0];
 assert.equal((overall.match(/<tr><th scope="row">/g)||[]).length,10);
 assert(overall.includes('<td>3</td>'));assert(americas.includes('<td>3</td>'));
 const projected={id:'va-intl-339',status:'played',homeScore:2,awayScore:1,home:{id:'USA',name:'USA'},away:{id:'BRA',name:'Brazil'},startsAt:INTERNATIONAL_VA_FIXTURES[0].startsAt};
 const fixtures=internationalFixtures(data.teams,[projected]);
 assert.equal(fixtures.length,52);assert.equal(fixtures.filter(f=>f.status==='played').length,1);
 assert.equal(fixtures.find(f=>f.id==='va-intl-339').homeScore,2);
 assert.throws(()=>internationalFixtures(data.teams,[{...projected,id:'va-intl-332'}]),/mappings need review/);
 assert.throws(()=>internationalFixtures(data.teams,[{...projected,id:'unknown'}]),/mappings need review/);s.sqlite.close();
});

test('public VA snapshot drives results, both regional tables, full player stats and Pickems without roster changes',async()=>{
 const {buildInternationalSnapshot}=await import('./sync-internationals.mjs');
 const {internationalFixtureSource}=await import('./fixtures/international-va.mjs');
 const {internationalPickemSeason}=await import('../functions/_lib/international-pickems.js');
 const fixture=internationalFixtureSource(),snapshot=await buildInternationalSnapshot(fixture.pageProps);
 const s=setup(),before=s.sqlite.prepare('SELECT count(*) n FROM league_players').get().n;
 s.env.ASSETS.fetch=async url=>new URL(url).pathname.endsWith('/s1-internationals.json')?Response.json(snapshot):new Response('');
 const data=await internationalData(s.env),ballot=internationalPickemSeason(data);
 assert.equal(data.resultsPublished,true);assert.equal(data.totals.played,10);assert.equal(data.players.length,12);
 assert.equal(ballot.weeks[0].matches.filter(m=>m[3]!==null).length,10);
 assert.equal(ballot.weeks[0].matches[0][0],1000000339);
 assert(ballot.weeks.slice(1).flatMap(w=>w.matches).every(m=>m[3]===null&&m[4]===null));
 assert(internationalContent(data,'results').includes('0 – 0'));
 assert(internationalContent(data,'stats').includes('Player 11'));
 const html=internationalContent(data,'standings');assert(html.includes('Overall Standings'));assert(html.includes('European Division'));assert(html.includes('Americas Division'));
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM league_players').get().n,before);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM league_roster_memberships').get().n,50);
 s.env.ASSETS.fetch=async()=>Response.json({...snapshot,seasonId:5});
 await assert.rejects(()=>internationalData(s.env),/mappings need review/);
 s.sqlite.close();
});
