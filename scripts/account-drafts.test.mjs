import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {sha256} from '../functions/_lib/auth.js';
import {previewDraftsApi as api} from '../functions/_lib/preview-drafts.js';
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_auth.sql',import.meta.url),'utf8'));
const adapter={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return db.prepare(sql).get(...this.args)||null;},async run(){return {meta:{changes:db.prepare(sql).run(...this.args).changes}};}};}};
const env={DB:adapter,OWNER_DISCORD_ID:'owner'},origin='https://preview.example';
for(const id of ['owner','member','other','suspended']){db.prepare('INSERT INTO users(discord_id,username,display_name,status) VALUES(?,?,?,?)').run(id,id,id,id==='suspended'?'suspended':'active');db.prepare("INSERT INTO sessions(id_hash,discord_id,expires_at) VALUES(?,?,datetime('now','+1 day'))").run(await sha256(id),id);}
const call=async(body,user='member',method=body===undefined?'GET':'POST',requestOrigin=origin,query='')=>{const response=await api(new Request(origin+'/api/drafts'+query,{method,headers:{origin:requestOrigin,cookie:'__Host-ufl_session='+user},...(method==='POST'?{body:JSON.stringify(body)}:{})}),env);return {status:response.status,...await response.json()};};
const draft={version:4,leagues:[{settings:{league:'Test league',season:'Season 3',teams:[]},scheduleGenerated:false,registrationOpen:true,acceptedResults:[]}],seasons:['Season 3'],competitions:[]};
assert.equal((await call(undefined,'missing')).status,401);
assert.equal((await call(undefined,'suspended')).status,401);
assert.equal((await call(undefined,'member','DELETE')).status,405);
assert.equal((await call({accountId:'member',revision:0,draft},'member','POST','https://bad.example')).status,403);
assert.equal((await call(undefined)).revision,0);
assert.equal((await call({accountId:'other',revision:0,draft})).status,409);
assert.equal((await call({accountId:'member',revision:-1,draft})).status,400);
assert.equal((await call(null)).status,400);
assert.equal((await call({accountId:'member',revision:0,draft:{version:99}})).status,400);
const saved=await call({accountId:'member',revision:0,draft});assert.equal(saved.status,200);assert.equal(saved.revision,1);
const loaded=await call(undefined);assert.deepEqual(loaded.draft,draft);assert.equal(loaded.account.id,'member');
// URL parameters cannot expose another account, including to a site owner.
assert.equal((await call(undefined,'owner','GET',origin,'?accountId=member')).draft,null);
assert.equal((await call(undefined,'other','GET',origin,'?accountId=member')).draft,null);
assert.equal((await call({accountId:'member',revision:0,draft})).status,409);
const changed={...draft,seasons:['Season 3','Season 4']};
assert.equal((await call({accountId:'member',revision:1,draft:changed})).revision,2);
assert.equal((await call({accountId:'member',revision:1,draft})).status,409);
assert.deepEqual((await call(undefined)).draft,changed);
assert.equal((await call({accountId:'other',revision:0,draft},'other')).status,200);
assert.deepEqual((await call(undefined)).draft,changed);
assert.equal((await call({accountId:'member',revision:2,draft:{...draft,padding:'😀'.repeat(230000)}})).status,413);
// Two mobile/desktop saves based on one revision: exactly one wins.
const writes=await Promise.all([call({accountId:'member',revision:2,draft}),call({accountId:'member',revision:2,draft:changed})]);assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);
db.prepare("UPDATE sessions SET expires_at=datetime('now','-1 day') WHERE discord_id='member'").run();assert.equal((await call(undefined)).status,401);
console.log('PASS: private account archives, member access, CSRF/auth, account switching, size limits and atomic cross-device revision conflicts.');
