import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {internationalData} from '../functions/_lib/internationals.js';
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
 const data=await internationalData(s.env);assert.equal(data.fixtures.length,0);assert.equal(data.windows.length,0);assert.equal(data.players.length,0);assert.equal(data.selections.length,0);assert.equal(data.resultsPublished,false);assert.equal(data.competition.minPlayers,5);assert.equal(data.competition.maxPlayers,6);s.sqlite.close();
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
test('published source failures are not disguised as an empty successful table',async()=>{
 const s=setup();s.sqlite.prepare("UPDATE international_competitions SET publish_results=1,shared_league_id='future-verified-source'").run();
 assert.equal((await api({request:request(),env:s.env})).status,503);s.sqlite.close();
});

test('national flags render as inline vectors rather than platform-dependent emoji',()=>{const view=internationalContent({teams:[{id:'ITA',name:'Italy',color:'#16875a',roster:[]}],totals:{played:0}},'teams');assert(view.includes('class="intl-flag-svg"'));assert(view.includes('viewBox="0 0 36 24"'));});
