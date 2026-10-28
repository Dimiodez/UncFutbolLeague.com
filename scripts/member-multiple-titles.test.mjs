import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import vm from 'node:vm';
import {sha256} from '../functions/_lib/auth.js';
import {ensureMemberTitles,memberTeamTitles,memberTitleTeams} from '../functions/_lib/member-titles.js';
import {onRequestPost as save} from '../functions/api/admin/title.js';
import {onRequestGet as members} from '../functions/api/admin/users.js';
import {onRequestGet as session} from '../functions/api/auth/session.js';
import {onRequestGet as directory} from '../functions/api/users.js';
const owner='111111111111111111',admin='222222222222222222',member='333333333333333333',other='444444444444444444';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
async function setup(){
 const db=new DatabaseSync(':memory:');db.exec(read('migrations/0001_auth.sql'));
 for(const [id,role] of [[owner,'owner'],[admin,'admin'],[member,'member'],[other,'member']]){
  db.prepare('INSERT INTO users(discord_id,username,display_name,role) VALUES(?,?,?,?)').run(id,id,id,role);
  db.prepare("INSERT INTO sessions(id_hash,discord_id,expires_at) VALUES(?,?,'2099-01-01')").run(await sha256(id),id);
 }
 const env={OWNER_DISCORD_ID:owner,DISCORD_CLIENT_ID:'configured',DISCORD_CLIENT_SECRET:'configured',DB:{
  prepare(sql){return {sql,params:[],bind(...p){this.params=p;return this},async run(){return {meta:db.prepare(sql).run(...this.params)}},async all(){return {results:db.prepare(sql).all(...this.params)}},async first(){return db.prepare(sql).get(...this.params)}}},
  async batch(statements){db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 }};
 await ensureMemberTitles(env);return {db,env};
}
const get=(actor,path)=>new Request('https://www.uncfutbolleague.com'+path,{headers:{cookie:'__Host-ufl_session='+actor}});
const post=(actor,body,origin='https://www.uncfutbolleague.com')=>new Request('https://www.uncfutbolleague.com/api/admin/title',{method:'POST',headers:{origin,cookie:'__Host-ufl_session='+actor,'content-type':'application/json'},body:JSON.stringify({discordId:member,...body})});
const both=[{title:'manager',teamId:'6v6:ROM'},{title:'manager',teamId:'10v10:club-1790120967830'}];
test('owner and admin can save two independent team titles and reload them across member views',async()=>{
 const {env,db}=await setup();
 assert.equal((await save({request:post(owner,{assignments:both}),env})).status,200);
 const list=await (await members({request:get(owner,'/api/admin/users'),env})).json();
 assert.equal(list.canManageRoles,true);assert.equal(list.users.find(u=>u.id===member).teamTitles.length,2);
 const current=await (await session({request:get(member,'/api/auth/session'),env})).json();
 assert.deepEqual(current.user.teamTitles.map(t=>t.division).sort(),['10v10','6v6']);
 const publicUsers=await (await directory({env})).json();
 const profile=publicUsers.users.find(u=>u.displayName===member);assert.equal(profile.teamTitles.length,2);
 assert.equal('titleUserId' in profile,false);assert.equal('userId' in profile.teamTitles[0],false);
 assert.equal((await save({request:post(admin,{assignments:[both[0],{...both[1],title:'captain'}]}),env})).status,200);
 const titles=await memberTeamTitles(env,member);assert.equal(titles.find(t=>t.teamId==='10v10:club-1790120967830').title,'captain');
 assert.equal(db.prepare('SELECT role FROM users WHERE discord_id=?').get(member).role,'member');
 assert.equal(db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='team_hub_managers'").get().n,0);
});
test('removing a second assignment preserves the first and repeated schema initialization cannot restore it',async()=>{
 const {env}=await setup();await save({request:post(owner,{assignments:both}),env});
 await save({request:post(owner,{assignments:[both[0]]}),env});await ensureMemberTitles(env);await ensureMemberTitles(env);
 assert.deepEqual((await memberTeamTitles(env,member)).map(t=>t.teamId),['6v6:ROM']);
 await save({request:post(owner,{assignments:[]}),env});await ensureMemberTitles(env);assert.equal((await memberTeamTitles(env,member)).length,0);
});
test('existing single-team records backfill once and old editors cannot erase multiple assignments',async()=>{
 const {env,db}=await setup();
 db.prepare('INSERT INTO member_titles(discord_id,title,team_name,assigned_by) VALUES(?,?,?,?)').run(member,'manager','UFL Roma',owner);
 await ensureMemberTitles(env);await ensureMemberTitles(env);
 assert.equal((await memberTeamTitles(env,member)).length,1);assert.equal((await memberTeamTitles(env,member))[0].teamId,'6v6:ROM');
 assert.equal((await save({request:post(owner,{title:'captain',teamName:'UFL Roma'}),env})).status,200);
 await save({request:post(owner,{assignments:both}),env});
 assert.equal((await save({request:post(owner,{title:'captain',teamName:'UFL Roma'}),env})).status,409);
 assert.equal((await memberTeamTitles(env,member)).length,2);
});
test('duplicates, unknown teams, invalid roles, over-limit and unauthorized writes are rejected without losing titles',async()=>{
 const {env}=await setup();await save({request:post(owner,{assignments:both}),env});
 for(const assignments of [[both[0],both[0]],[{title:'manager',teamId:'6v6:unknown'}],[{title:'admin',teamId:'6v6:ROM'}],Array(11).fill(both[0]),null]){
  assert.equal((await save({request:post(owner,{assignments}),env})).status,400);
 }
 assert.equal((await save({request:post(member,{assignments:[]}),env})).status,403);
 assert.equal((await save({request:post(owner,{assignments:[]},'https://evil.example'),env})).status,403);
 assert.equal((await memberTeamTitles(env,member)).length,2);
});
test('selector distinguishes divisions, supports repeatable rows and retains legacy entries',()=>{
 const source=read('app.js'),start=source.indexOf('let adminTitleTeams=[];'),end=source.indexOf('function adminMemberRow(',start);
 const context=vm.createContext({escapeHtml:s=>String(s).replaceAll('<','&lt;')});vm.runInContext(source.slice(start,end),context);
 context.teams=memberTitleTeams();context.user={id:member,displayName:'Test member',teamTitles:[{title:'manager',teamId:'6v6:ROM',teamName:'UFL Roma',division:'6v6'},{title:'manager',teamId:'10v10:club-1790120967830',teamName:'UFL Maykop',division:'10v10'}]};
 vm.runInContext('adminTitleTeams=teams;',context);
 const html=vm.runInContext('teamTitleControls(user)',context);
 assert.equal((html.match(/data-title-row>/g)||[]).length,2);
 assert.match(html,/\+ Add team/);assert.match(html,/Save titles/);assert.match(html,/6v6 · UFL Roma/);assert.match(html,/10v10 · UFL Maykop/);
 assert.equal((html.match(/data-title-remove/g)||[]).length,2);
 const badges=vm.runInContext('memberTitleBadges(user)',context);assert.match(badges,/6v6/);assert.match(badges,/10v10/);
});

test('title selector retains every currently published league team plus both house teams',()=>{
 const options=memberTitleTeams();
 for(const division of ['6v6','10v10']){
  const season=JSON.parse(read('pickems-app/seasons/s2-'+division+'.json'));
  for(const [name] of Object.values(season.teams)){
   // VA participant 25 was renamed; account assignments retain the stable ITA
   // identity and existing manager memberships, rather than create a new team.
   const identity=division==='6v6'&&name==='UFL Tenerife'?'6v6:ITA':null;
   assert.ok(options.some(t=>t.division===division&&(identity?t.id===identity:t.name===name)),division+': '+name);
  }
 }
 assert.equal(options.filter(t=>t.division==='house').length,2);
});
