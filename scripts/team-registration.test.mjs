import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
import {teamRegistrationApi,TEAM_REGISTRATION_SCHEMA} from '../functions/_lib/team-registration.js';
import {sha256} from '../functions/_lib/auth.js';
import {onRequest as teamsPage} from '../functions/my-teams.js';
import {liveTeamHub} from '../functions/_lib/team-hub.js';
import {acceptedMemberHubs} from '../functions/_lib/member-team-hubs.js';
import {newTactic} from '../team-tactics-model.js';
import {memberTeamEntries} from '../league-suite-runtime/league-registration-invites.js';
const club={id:'123456',name:'Test FC',platform:'common-gen5',verifiedAt:'2026-11-13T12:00:00Z'};
async function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(discord_id TEXT PRIMARY KEY,username TEXT,display_name TEXT,avatar_url TEXT,role TEXT,status TEXT,created_at TEXT);CREATE TABLE sessions(id_hash TEXT,discord_id TEXT,expires_at TEXT);CREATE TABLE preview_league_results(id TEXT PRIMARY KEY,draft_json TEXT);");
 for(const [id,role] of [['owner','owner'],['admin','admin'],['alice','member'],['bob','member'],['blocked','member']]){sql.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(id,id,id,null,role,id==='blocked'?'blocked':'active','2026-01-01');sql.prepare('INSERT INTO sessions VALUES(?,?,?)').run(await sha256('token-'+id),id,'2099-01-01');}
 const saved={settings:{league:'Future League',season:'Season 3',format:'6v6',timeZone:'America/Chicago',startDate:'2027-01-01',windows:[],teams:[]},acceptedResults:[{matchId:'existing-result'}]};sql.prepare('INSERT INTO preview_league_results VALUES(?,?)').run('future-league',JSON.stringify(saved));
 const DB={prepare(text){return {sql:text,args:[],bind(...args){this.args=args;return this;},async first(){return sql.prepare(text).get(...this.args)||null;},async all(){return {results:sql.prepare(text).all(...this.args)};},async run(){return {meta:{changes:Number(sql.prepare(text).run(...this.args).changes)}};}};},async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 const env={DB,LEAGUE_SUITE_DB:DB},options={search:async()=>({clubs:[club]}),verify:async selection=>{if(selection?.id!==club.id)throw Error('EA could not verify that selection.');return club;}};
 const call=(user,body,query='',origin='https://site.test')=>teamRegistrationApi(new Request('https://site.test/api/my-teams'+query,{method:body?'POST':'GET',headers:{cookie:user?'__Host-ufl_session=token-'+user:'',origin,'content-type':'application/json'},...(body?{body:JSON.stringify({accountId:user,...body})}:{})}),env,options);
 const create=async(user='alice',values={})=>{const r=await call(user,{action:'create',name:'Test FC',...values});assert.equal(r.status,200,await r.clone().text());return (await r.json()).teamId;};
 return {sql,DB,call,create,env,options,team:id=>sql.prepare('SELECT * FROM member_teams WHERE id=?').get(id),audit:()=>sql.prepare('SELECT * FROM member_team_audit').all(),saved};
}
test('members create their own teams without staff grants, while anonymous and blocked accounts cannot',async()=>{
 const s=await setup();assert.equal((await s.call(null)).status,401);assert.equal((await s.call('blocked',{action:'create',name:'Blocked'})).status,401);
 assert.equal((await s.call('alice',{action:'create',name:'Other',managerId:'bob'})).status,403);
 const id=await s.create();assert.equal(s.team(id).manager_id,'alice');assert.equal(s.sql.prepare("SELECT role FROM users WHERE discord_id='alice'").get().role,'member');assert.equal(s.audit().length,1);
 const mine=await(await s.call('alice')).json(),other=await(await s.call('bob')).json();assert.equal(mine.teams.length,1);assert.equal(other.teams.length,0);assert.deepEqual(mine.users,[]);assert.deepEqual(mine.sources,[]);assert.equal(mine.staff,false);s.sql.close();
});
test('staff can create on behalf of a member and hand off the same durable team, revoking previous manager access',async()=>{
 const s=await setup(),id=await s.create('admin',{managerId:'alice'});assert.equal(s.team(id).manager_id,'alice');
 assert.equal((await s.call('alice',{action:'handoff',teamId:id,revision:1,managerId:'bob'})).status,403);
 assert.equal((await s.call('owner',{action:'handoff',teamId:id,revision:1,managerId:'blocked'})).status,400);
 assert.equal((await s.call('owner',{action:'handoff',teamId:id,revision:1,managerId:'bob'})).status,200);assert.equal(s.team(id).manager_id,'bob');assert.equal(s.team(id).revision,2);
 assert.equal((await s.call('alice',{action:'rename',teamId:id,revision:2,name:'Stolen'})).status,403);assert.equal((await(await s.call('alice')).json()).teams.length,0);
 assert.equal((await s.call('bob',{action:'rename',teamId:id,revision:2,name:'New Name'})).status,200);assert.equal(s.team(id).name,'New Name');assert.equal(s.team(id).created_by,'admin');assert.equal(s.audit().length,3);s.sql.close();
});
test('league registration is staff controlled and off by default; application approval cannot alter saved fixtures/results',async()=>{
 const s=await setup(),id=await s.create('alice',{club});assert.deepEqual((await(await s.call('alice')).json()).leagues,[]);
 assert.equal((await s.call('alice',{action:'league',leagueId:'future-league',open:true})).status,403);
 assert.equal((await s.call('admin',{action:'league',leagueId:'future-league',open:true})).status,200);
 const before=s.sql.prepare('SELECT draft_json FROM preview_league_results').get().draft_json;
 assert.equal((await s.call('alice',{action:'apply',teamId:id,revision:1,leagueId:'future-league'})).status,200);
 const input={action:'review',teamId:id,revision:1,leagueId:'future-league',applicationRevision:1,status:'approved'};assert.equal((await s.call('alice',input)).status,403);assert.equal((await s.call('admin',input)).status,200);
 assert.equal(s.sql.prepare('SELECT status FROM member_team_applications').get().status,'approved');assert.equal(s.sql.prepare('SELECT draft_json FROM preview_league_results').get().draft_json,before);
 assert.equal((await s.call('alice',{action:'link-club',teamId:id,revision:1,club})).status,409);
 assert.equal((await s.call('owner',{action:'handoff',teamId:id,revision:1,managerId:'bob'})).status,200);assert.equal((await(await s.call('bob')).json()).applications[0].status,'approved');s.sql.close();
});
test('closed leagues, registration windows, missing EA links and repeat applications are enforced',async()=>{
 const s=await setup(),id=await s.create(),apply={action:'apply',teamId:id,revision:1,leagueId:'future-league'};
 await s.call('admin',{action:'league',leagueId:'future-league',open:false});assert.equal((await s.call('alice',apply)).status,409);
 await s.call('admin',{action:'league',leagueId:'future-league',open:true});assert.equal((await s.call('alice',apply)).status,400);
 assert.equal((await s.call('alice',{action:'link-club',teamId:id,revision:1,club})).status,200);apply.revision=2;assert.equal((await s.call('alice',apply)).status,200);assert.equal((await s.call('alice',apply)).status,409);
 assert.equal((await s.call('alice',{action:'withdraw',teamId:id,revision:2,leagueId:'future-league',applicationRevision:1})).status,200);assert.equal((await s.call('alice',apply)).status,200);
 const settings={...s.saved.settings,windows:[{type:'registration',from:'2090-01-01',to:'2090-01-02'}]};s.sql.prepare('UPDATE preview_league_results SET draft_json=?').run(JSON.stringify({settings}));assert.equal((await(await s.call('alice')).json()).leagues[0].open,false);s.sql.close();
});
test('empty leagues can open member registration before fixtures exist and approved teams map back into the creation hub',async()=>{
 const s=await setup(),board='a'.repeat(24);s.sql.exec('CREATE TABLE preview_registration_boards(id TEXT PRIMARY KEY,settings TEXT,is_open INTEGER,expires INTEGER)');s.sql.prepare('INSERT INTO preview_registration_boards VALUES(?,?,1,?)').run(board,JSON.stringify(s.saved.settings),Date.now()+86400000);s.sql.exec('DELETE FROM preview_league_results');
 const leagueId='board:'+board,id=await s.create('alice',{club});assert.equal((await s.call('owner',{action:'league',leagueId,open:true})).status,200);assert.equal((await s.call('alice',{action:'apply',teamId:id,revision:1,leagueId})).status,200);
 let data=await(await s.call('owner')).json();assert.equal(memberTeamEntries(data,[leagueId]).length,0);assert.equal((await s.call('admin',{action:'review',teamId:id,revision:1,leagueId,applicationRevision:1,status:'approved'})).status,200);
 data=await(await s.call('owner')).json();const entries=memberTeamEntries(data,[leagueId]);assert.equal(entries.length,1);assert.equal(entries[0].id,id);assert.equal(entries[0].ea_id,club.id);assert.equal(entries[0].manager_id,'alice');
 s.sql.exec('UPDATE preview_registration_boards SET is_open=0');assert.equal((await(await s.call('alice')).json()).leagues[0].open,false);s.sql.close();
});
const hubRequest=(s,user,id,body)=>liveTeamHub(new Request('https://site.test/api/team-hub?team='+encodeURIComponent('member:'+id),{method:body?'POST':'GET',headers:{origin:'https://site.test',cookie:'__Host-ufl_session=token-'+user},...(body?{body:JSON.stringify({teamId:'member:'+id,accountId:user,...body})}:{})}),s.env);
test('owner or admin approval automatically creates a private hub, once, retaining playbooks across extra leagues and manager handoff',async()=>{
 for(const approver of ['owner','admin']){
  const s=await setup(),id=await s.create('alice',{club});assert.equal((await hubRequest(s,'alice',id)).status,404);assert.equal(s.sql.prepare('SELECT count(*) n FROM member_team_hubs').get().n,0);
  await s.call('owner',{action:'league',leagueId:'future-league',open:true});await s.call('alice',{action:'apply',teamId:id,revision:1,leagueId:'future-league'});assert.equal((await hubRequest(s,'alice',id)).status,404);
  const review={action:'review',teamId:id,revision:1,leagueId:'future-league',applicationRevision:1,status:'approved'};assert.equal((await s.call(approver,review)).status,200);
  const hub=await(await hubRequest(s,'alice',id)).json();assert.equal(hub.team.memberTeam,true);assert.equal(hub.revision,0);assert.equal(hub.team.canEdit,true);assert.equal((await hubRequest(s,'bob',id)).status,403);assert.equal((await hubRequest(s,'admin',id)).status,200);
  const book={version:1,boards:[newTactic('Accepted team playbook','attack')]};assert.equal((await hubRequest(s,'alice',id,{revision:0,playbook:book})).status,200);
  assert.equal((await s.call(approver,review)).status,409);s.sql.prepare('INSERT INTO preview_league_results VALUES(?,?)').run('second-league',JSON.stringify(s.saved));await s.call('owner',{action:'league',leagueId:'second-league',open:true});await s.call('alice',{action:'apply',teamId:id,revision:1,leagueId:'second-league'});await s.call(approver,{...review,leagueId:'second-league'});
  assert.equal(s.sql.prepare('SELECT count(*) n FROM member_team_hubs').get().n,1);assert.equal((await(await hubRequest(s,'alice',id)).json()).revision,1);
  assert.equal((await s.call('admin',{action:'handoff',teamId:id,revision:1,managerId:'bob'})).status,200);assert.equal((await hubRequest(s,'alice',id)).status,403);const inherited=await(await hubRequest(s,'bob',id)).json();assert.deepEqual(inherited.playbook,book);assert.equal(inherited.team.acceptedLeagues.length,2);
  assert.equal((await acceptedMemberHubs(s.DB,{discord_id:'alice',role:'member'})).length,0);assert.equal((await acceptedMemberHubs(s.DB,{discord_id:'bob',role:'member'})).length,1);assert.match((await(await s.call('bob')).json()).teams[0].hubUrl,/member%3A/);s.sql.close();
 }
});
test('failed approval rolls back automatic hub creation and stale managers cannot save a hub during handoff',async()=>{
 const s=await setup(),id=await s.create('alice',{club});await s.call('owner',{action:'league',leagueId:'future-league',open:true});await s.call('alice',{action:'apply',teamId:id,revision:1,leagueId:'future-league'});
 const batch=s.DB.batch;let fail=true;s.DB.batch=async statements=>{if(fail&&statements[0].sql.startsWith('UPDATE member_team_applications')){const run=statements.at(-1).run;statements.at(-1).run=async()=>{throw Error('Simulated audit outage');};}return batch(statements);};
 const review={action:'review',teamId:id,revision:1,leagueId:'future-league',applicationRevision:1,status:'approved'};assert.equal((await s.call('owner',review)).status,400);assert.equal(s.sql.prepare('SELECT status FROM member_team_applications').get().status,'pending');assert.equal(s.sql.prepare('SELECT count(*) n FROM member_team_hubs').get().n,0);fail=false;await s.call('owner',review);
 const prepare=s.DB.prepare.bind(s.DB);let raced=false;s.DB.prepare=text=>{const statement=prepare(text);if(text.startsWith('UPDATE member_team_hubs')){const run=statement.run.bind(statement);statement.run=async()=>{if(!raced){raced=true;s.sql.prepare('UPDATE member_teams SET manager_id=?,revision=revision+1 WHERE id=?').run('bob',id);}return run();};}return statement;};
 assert.equal((await hubRequest(s,'alice',id,{revision:0,playbook:{version:1,boards:[]}})).status,409);assert.equal(s.sql.prepare('SELECT revision FROM member_team_hubs').get().revision,0);s.sql.close();
});
test('verified club linking, duplicate name/club protection and failed verification preserve atomic audit history',async()=>{
 const s=await setup(),id=await s.create('alice',{club});const count=s.audit().length;
 assert.equal((await s.call('bob',{action:'create',name:'test fc'})).status,409);assert.equal((await s.call('bob',{action:'create',name:'Other',club})).status,409);
 assert.equal((await s.call('bob',{action:'create',name:'Bad Link',club:{id:'fake'}})).status,400);assert.equal(s.audit().length,count);assert.equal(s.sql.prepare('SELECT count(*) n FROM member_teams').get().n,1);
 const result=await(await s.call('alice',null,'?search=Test')).json();assert.equal(result.clubs[0].id,club.id);assert.equal(s.team(id).ea_club_id,club.id);s.sql.close();
});
test('CSRF, changed accounts, stale revisions, creation limits and oversized input do not change teams',async()=>{
 const s=await setup(),id=await s.create();const change={action:'rename',teamId:id,revision:1,name:'Rename'};
 assert.equal((await s.call('alice',change,'','https://evil.test')).status,403);assert.equal((await s.call('alice',{...change,accountId:'bob'})).status,409);assert.equal((await s.call('alice',{...change,revision:0})).status,409);
 assert.equal((await s.call('alice',{action:'create',name:'x'.repeat(9000)})).status,413);for(let i=0;i<4;i++)await s.create('alice',{name:'Team '+i});assert.equal((await s.call('alice',{action:'create',name:'Sixth Team'})).status,409);assert.equal(s.audit().length,5);s.sql.close();
});
test('concurrent manager handoff cannot leave a misleading edit audit or permit the previous manager to write',async()=>{
 const s=await setup(),id=await s.create(),batch=s.DB.batch;let changed=false;
 s.DB.batch=async statements=>{if(!changed&&statements[0].sql.startsWith('UPDATE member_teams')){changed=true;s.sql.prepare('UPDATE member_teams SET manager_id=?,revision=revision+1 WHERE id=?').run('bob',id);}return batch(statements);};
 assert.equal((await s.call('alice',{action:'rename',teamId:id,revision:1,name:'Race'})).status,409);assert.equal(s.team(id).name,'Test FC');assert.equal(s.audit().length,1);s.sql.close();
});
test('registration closing during submission cannot insert an application or a false audit entry',async()=>{
 const s=await setup(),id=await s.create('alice',{club});await s.call('owner',{action:'league',leagueId:'future-league',open:true});const count=s.audit().length,batch=s.DB.batch;let closed=false;
 s.DB.batch=async statements=>{if(!closed&&statements[0].sql.startsWith('INSERT INTO member_team_applications')){closed=true;s.sql.exec('UPDATE member_team_leagues SET is_open=0');}return batch(statements);};
 assert.equal((await s.call('alice',{action:'apply',teamId:id,revision:1,leagueId:'future-league'})).status,409);assert.equal(s.sql.prepare('SELECT count(*) n FROM member_team_applications').get().n,0);assert.equal(s.audit().length,count);s.sql.close();
});
test('public team page preserves the full site header and scripts are included in public publication',async()=>{
 const response=await teamsPage({request:new Request('https://site.test/my-teams'),env:{ASSETS:{fetch:async()=>new Response('<header class="site-header"><a href="/ufb">UFB documentation</a><a href="/utility">Utility Fun League</a></header><footer class="site-footer">Footer</footer>')}}});const html=await response.text();assert.equal(response.status,200);assert.match(html,/UFB documentation/);assert.match(html,/Utility Fun League/);assert.match(html,/id="teams-root"/);assert.match(html,/my-teams.js/);assert.match(response.headers.get('cache-control'),/no-store/);
 const publication=await import('./publication.mjs');assert(publication.isPublicFile('my-teams.js'));assert(publication.isPublicFile('my-teams.css'));assert(fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').includes('href="/my-teams"'));assert.deepEqual(TEAM_REGISTRATION_SCHEMA.filter(s=>/DROP|DELETE|ALTER/.test(s)),[]);
});
