import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {searchEaClubs,verifyEaClub,normalizeClubSearch} from '../league-suite-runtime/functions/_lib/ea-club-search.js';
import {leagueTeamLinkApi} from '../league-suite-runtime/functions/_lib/league-team-links.js';
import {internationalTeamLinksApi} from '../functions/_lib/international-team-links.js';
import {linkDraftTeamClub} from '../league-suite-runtime/league-team-linking.js';
import {reconcileSharedLeagues} from '../league-suite-runtime/league-shared-workspace.js';
import {buildLeagueSchedule,createLeagueDraft} from '../league-suite-runtime/league-engine.js';
import {eaTrialSettings} from '../league-suite-runtime/league-ea-trial.js';
import {eaClubRequest,mountTeamClubSearch} from '../league-suite-runtime/league-team-search.js';
import {onRequest as suiteApi} from '../functions/api/league-suite/[[path]].js';
const club={id:'123456',name:'National Test FC',platform:'common-gen5',verifiedAt:'2026-11-12T19:00:00.000Z'};
const settings=()=>{const value=eaTrialSettings();delete value.trialSchedule;return {...value,collectionEnabled:true,serverLeagueId:'link-test',teams:value.teams.map(t=>({...t,eaClubId:''}))};};
function setup(role='owner'){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('CREATE TABLE preview_league_results(id TEXT PRIMARY KEY,draft_json TEXT,revision INTEGER DEFAULT 1,enabled INTEGER DEFAULT 1,checked_at TEXT,succeeded_at TEXT,health TEXT,updated_at TEXT);');
 sqlite.exec(fs.readFileSync(new URL('../migrations/20261106_internationals.sql',import.meta.url),'utf8').replace('REFERENCES league_players(id)',''));
 sqlite.exec(fs.readFileSync(new URL('../migrations/20261112_international_team_links.sql',import.meta.url),'utf8'));
 sqlite.prepare('INSERT INTO international_competitions(id,name) VALUES(?,?)').run('ufl-internationals','Internationals');
 for(const [id,name] of [['ITA','Italy'],['FRA','France']])sqlite.prepare('INSERT INTO international_teams(competition_id,id,name,flag,color) VALUES(?,?,?,?,?)').run('ufl-internationals',id,name,'flag','#fff');
 const DB={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...this.args).changes)}};}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const draft=buildLeagueSchedule(settings());sqlite.prepare('INSERT INTO preview_league_results(id,draft_json) VALUES(?,?)').run('link-test',JSON.stringify(draft));
 return {sqlite,draft,env:{DB,SUITE_ACTOR:role?{discord_id:'test-staff',role}:null},row:()=>sqlite.prepare('SELECT * FROM preview_league_results WHERE id=?').get('link-test')};
}
const req=(path,payload,origin='https://www.uncfutbolleague.com')=>new Request('https://www.uncfutbolleague.com'+path,{method:payload===undefined?'GET':'POST',headers:{origin,'content-type':'application/json'},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
const body=s=>({leagueId:'link-test',revision:1,teamId:s.draft.settings.teams[0].id,club});
const options={verify:async()=>club};

test('EA name lookup encodes queries, deduplicates IDs, and falls back without fabricating empty success',async()=>{
 const calls=[];const result=await searchEaClubs('Test & FC',{fetcher:async(url,opts)=>{calls.push([url,opts]);return calls.length===1?new Response('',{status:403}):Response.json([{clubId:123456,name:'Test & FC'},{clubId:123456,name:'Test & FC'}]);}});
 assert.equal(result.clubs.length,1);assert.equal(result.clubs[0].id,'123456');assert.match(calls[0][0],/clubName=Test%20%26%20FC/);assert.match(calls[0][1].headers['user-agent'],/Chrome/);assert.equal(calls[1][1].redirect,'manual');
 await assert.rejects(()=>searchEaClubs('Test FC',{fetcher:async()=>Response.json({error:'provider failed'})}),/unavailable/);
 assert.throws(()=>normalizeClubSearch([{clubId:'bad',name:'Test'}]),/Invalid/);
 await assert.rejects(()=>searchEaClubs('a'),/between 2 and 80/);
});
test('verification requires the exact selected ID on the supported platform',async()=>{
 const fetcher=async()=>Response.json([{clubId:123456,name:'EA canonical name'}]);
 assert.equal((await verifyEaClub(club,{fetcher})).name,'EA canonical name');
 await assert.rejects(()=>verifyEaClub({...club,id:'999'},{fetcher}),/could not verify/);
 await assert.rejects(()=>verifyEaClub({...club,platform:'other'},{fetcher}),/current-generation/);
});
test('draft linking preserves fixture identities and recorded evidence, rejects duplicates and historical rewrites',()=>{
 const draft=buildLeagueSchedule(settings()),first=draft.settings.teams[0].id,linked=linkDraftTeamClub(draft,first,club);
 assert.equal(draft.settings.teams[0].eaClubId,'');assert.equal(linked.settings.teams[0].eaClubId,club.id);
 assert.deepEqual(linked.fixtures.map(f=>[f.id,f.startsAt]),draft.fixtures.map(f=>[f.id,f.startsAt]));
 assert(linked.fixtures.filter(f=>f.home.id===first).every(f=>f.home.eaClubId===club.id));
 assert.throws(()=>linkDraftTeamClub(linked,draft.settings.teams[1].id,club),/already linked/);
 const fixture=linked.fixtures.find(f=>f.home.id===first||f.away.id===first),recorded={...linked,acceptedResults:[{fixtureId:fixture.id,homeScore:2,awayScore:1,appearances:[{name:'Keep me'}]}]};
 assert.throws(()=>linkDraftTeamClub(recorded,first,{...club,id:'999'}),/recorded matches/);
 assert.deepEqual(linkDraftTeamClub(recorded,first,club).acceptedResults,recorded.acceptedResults);
 assert.throws(()=>linkDraftTeamClub({...linked,pendingResults:[{fixtureId:fixture.id}]},first,{...club,id:'999'}),/recorded matches/);
 assert.throws(()=>linkDraftTeamClub({...draft,settings:{...draft.settings,teams:draft.settings.teams.map((t,i)=>i===0?{...t,eaClubReplacement:{previousId:'333'}}:t)}},first,club),/dated club replacement/);
 assert.equal(linkDraftTeamClub(createLeagueDraft(settings()),first,club).scheduleGenerated,false);
});
for(const role of ['owner','admin'])test(`${role} saves verified shared link, audit and revision without changing scores or enabling collection`,async()=>{
 const s=setup(role);s.sqlite.prepare('UPDATE preview_league_results SET enabled=0').run();
 const before=JSON.parse(s.row().draft_json),response=await leagueTeamLinkApi(req('/api/ea/team-link',body(s)),s.env,options);
 assert.equal(response.status,200);const after=JSON.parse(s.row().draft_json);assert.deepEqual(after.acceptedResults,before.acceptedResults);assert.equal(s.row().enabled,0);assert.equal(s.row().revision,2);assert.equal(after.teamLinkAudit[0].actor,'test-staff');
 const hydrated=reconcileSharedLeagues([s.draft],[{...s.row(),draft:after}])[0];assert.equal(hydrated.settings.teams[0].eaClubId,club.id);assert.equal(hydrated.settings.teams[0].eaClubLink.name,club.name);
 assert.equal((await leagueTeamLinkApi(req('/api/ea/team-link',body(s)),s.env,options)).status,409);s.sqlite.close();
});
test('link backend rejects unauthorized, cross-origin, unknown teams, invalid selection, and racing collector writes',async()=>{
 for(const role of [null,'member','manager']){const s=setup(role);assert.equal((await leagueTeamLinkApi(req('/api/ea/team-link',body(s)),s.env,options)).status,403);s.sqlite.close();}
 const s=setup(),before=s.row().draft_json;
 assert.equal((await leagueTeamLinkApi(req('/api/ea/team-link',body(s),'https://evil.test'),s.env,options)).status,403);
 assert.equal((await leagueTeamLinkApi(req('/api/ea/team-link',{...body(s),teamId:'unknown'}),s.env,options)).status,400);
 assert.equal((await leagueTeamLinkApi(req('/api/ea/team-link',{...body(s),club:{id:'bad'}}),s.env,options)).status,400);
 const response=await leagueTeamLinkApi(req('/api/ea/team-link',body(s)),s.env,{verify:async()=>{s.sqlite.prepare('UPDATE preview_league_results SET revision=revision+1').run();return club;}});
 assert.equal(response.status,409);assert.equal(s.row().draft_json,before);s.sqlite.close();
});
test('verification-only endpoint never stores a personal or league link, and rejects provider failure',async()=>{
 const s=setup(),before=s.row().draft_json;
 assert.equal((await leagueTeamLinkApi(req('/api/ea/verify',{club}),s.env,options)).status,200);assert.equal(s.row().draft_json,before);
 assert.equal((await leagueTeamLinkApi(req('/api/ea/verify',{club}),s.env,{verify:async()=>{throw Error('EA unavailable');}})).status,502);s.sqlite.close();
});
test('national setup saves verified country IDs and audit without activating migration or changing rosters/results',async()=>{
 const s=setup();const response=await internationalTeamLinksApi(req('/api/international-setup',{teamId:'ITA',expectedClubId:null,club}),s.env,options);
 assert.equal(response.status,200,await response.clone().text());assert.equal(s.sqlite.prepare("SELECT ea_club_id FROM international_teams WHERE id='ITA'").get().ea_club_id,club.id);
 assert.equal(s.sqlite.prepare('SELECT count(*) n FROM international_team_link_audit').get().n,1);assert.equal(s.sqlite.prepare('SELECT count(*) n FROM international_roster_audit').get().n,0);
 const comp=s.sqlite.prepare('SELECT * FROM international_competitions').get();assert.equal(comp.publish_results,0);assert.equal(comp.shared_league_id,null);assert.equal(s.sqlite.prepare('SELECT count(*) n FROM international_rosters').get().n,0);
 const data=await(await internationalTeamLinksApi(req('/api/international-setup'),s.env)).json();assert.equal(data.linkedTeams,1);assert.equal(data.competition.trackingSource,'virtual-arena');
 assert.equal((await internationalTeamLinksApi(req('/api/international-setup',{teamId:'FRA',expectedClubId:null,club}),s.env,options)).status,409);
 assert.equal((await internationalTeamLinksApi(req('/api/international-setup',{teamId:'ITA',expectedClubId:null,club}),s.env,options)).status,409);s.sqlite.close();
});
test('national links reject CSRF, role bypass, published-source changes and activation races without false audit',async()=>{
 const s=setup(),payload={teamId:'ITA',expectedClubId:null,club};
 for(const role of [null,'member','manager'])assert.equal((await internationalTeamLinksApi(req('/api/international-setup',payload),{...s.env,SUITE_ACTOR:role?{role}:null},options)).status,403);
 assert.equal((await internationalTeamLinksApi(req('/api/international-setup',payload,'https://evil.test'),s.env,options)).status,403);
 const activate=()=>s.sqlite.prepare("UPDATE international_competitions SET publish_results=1,shared_league_id='international-source'").run();
 const response=await internationalTeamLinksApi(req('/api/international-setup',payload),s.env,{verify:async()=>{activate();return club;}});assert.equal(response.status,409);assert.equal(s.sqlite.prepare('SELECT count(*) n FROM international_team_link_audit').get().n,0);
 assert.equal((await internationalTeamLinksApi(req('/api/international-setup',payload),s.env,options)).status,409);
 assert.equal(s.sqlite.prepare("SELECT ea_club_id FROM international_teams WHERE id='ITA'").get().ea_club_id,null);s.sqlite.close();
});
test('client reports sign-in/error pages honestly rather than treating them as empty search results',async()=>{
 await assert.rejects(()=>eaClubRequest('/search?name=test',null,{fetcher:async()=>new Response('<html>Sign in</html>',{status:403})}),/sign-in/);
 await assert.rejects(()=>eaClubRequest('/team-link',{club},{fetcher:async()=>Response.json({error:'Stale revision'},{status:409})}),/Stale revision/);
});
test('national setup stays behind the Suite access gate and uses website storage rather than the collector DB',async()=>{
 for(const [role,admins,expected] of [['owner',0,200],['admin',1,200],['admin',0,403],['member',1,403],[null,1,401]]){
  const s=setup(role),prepare=s.env.DB.prepare;
  s.env.DB.prepare=sql=>sql.includes('FROM sessions')?{bind(){return this;},async first(){return role?{discord_id:'staff',role,status:'active'}:null;}}:sql.includes('league_suite_access')?{async first(){return {admins_enabled:admins};}}:prepare(sql);
  const response=await suiteApi({request:new Request('https://www.uncfutbolleague.com/api/league-suite/international-setup',{headers:{cookie:'__Host-ufl_session=test'}}),env:s.env});
  assert.equal(response.status,expected);if(expected===200){assert.equal((await response.json()).teams.length,2);assert.match(response.headers.get('cache-control'),/private, no-store/);}s.sqlite.close();
 }
});
test('per-actor link limits block further verification before contacting EA',async()=>{
 const s=setup();let calls=0;for(let n=0;n<16;n++){
  const response=await leagueTeamLinkApi(req('/api/ea/verify',{club}),s.env,{verify:async()=>{calls++;return club;}});
  assert.equal(response.status,n<15?200:429);
 }
 assert.equal(calls,15);assert.equal(s.row().revision,1);s.sqlite.close();
});

class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.handlers={};this.textContent='';this.disabled=false;this.parent=null;this.value='';}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const node of this.children)node.parent=null;this.children=[];this.append(...nodes);}
 setAttribute(name,value){this[name]=value;}
 addEventListener(name,handler){this.handlers[name]=handler;}
 querySelectorAll(tag){return this.children.flatMap(child=>[...(child.tagName===tag?[child]:[]),...child.querySelectorAll(tag)]);}
 get isConnected(){return this.root||!!this.parent?.isConnected;}
 focus(){}
}
test('search widget requires explicit Link, escapes names as text, supports retry and ignores late searches',async()=>{
 const oldDocument=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const host=new Element('main');host.root=true;let links=0,fail=true;
  const area=mountTeamClubSearch({host,name:'National Test FC',request:async()=>({clubs:[{...club,name:'<img onerror=evil()>'}]}),onLink:async()=>{links++;if(fail)throw Error('Try linking again');return 'Saved online';}});
  const input=area.querySelectorAll('input')[0],search=area.querySelectorAll('button')[0];await search.onclick();assert.equal(links,0);
  assert.equal(area.querySelectorAll('strong')[0].textContent,'<img onerror=evil()>');assert.equal(area.querySelectorAll('img').length,0);
  const link=area.querySelectorAll('button')[1];assert.equal(link.textContent,'Link');await link.onclick();assert.equal(link.disabled,false);assert.equal(link.textContent,'Link');
  fail=false;await link.onclick();assert.equal(links,2);assert.equal(link.textContent,'Linked');assert.equal(link.disabled,true);
  let finish;const stale=mountTeamClubSearch({host,name:'Old query',request:()=>new Promise(resolve=>finish=resolve),onLink:async()=>{}}),pending=stale.querySelectorAll('button')[0].onclick();
  const staleInput=stale.querySelectorAll('input')[0];staleInput.value='New query';staleInput.handlers.input();finish({clubs:[club]});await pending;assert.equal(stale.querySelectorAll('button').length,1);
  input.value='x';await search.onclick();assert.equal(area.querySelectorAll('p')[0].textContent,'Enter at least 2 characters of the in-game club name.');
 }finally{globalThis.document=oldDocument;}
});
