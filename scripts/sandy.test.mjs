import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {scoreRun,ensureSandy} from '../functions/_lib/sandy.js';
import {sha256} from '../functions/_lib/auth.js';
import {onRequestPost} from '../functions/api/sandy/run.js';
import {onRequestGet} from '../functions/api/sandy/leaderboard.js';
const drops=[{kind:'drop',t:10},{kind:'drop',t:12},{kind:'drop',t:14}];
test('server derives score, combo and survival from events rather than submitted totals',()=>{
 const events=[1,2,3,4,5].map(t=>({kind:'touch',t}));
 events.push({kind:'castle',id:0,t:6},{kind:'builder',id:1,t:8},...drops);
 assert.deepEqual(scoreRun(events,14,20),{score:1000,seconds:14,combo:5});
});
test('rejects repeated obstacles, impossible timing, early lives and unfinished runs',()=>{
 for(const events of [[{kind:'castle',id:0,t:1},{kind:'castle',id:0,t:2},...drops],[{kind:'life',t:1},...drops],[{kind:'builder',id:99,t:2},...drops],[{kind:'touch',t:1},{kind:'touch',t:1.01},...drops],drops.slice(1),[{kind:'score',t:1},...drops]])assert.throws(()=>scoreRun(events,14,20));
 assert.throws(()=>scoreRun(drops,14,1));
 assert.deepEqual(scoreRun([{kind:'drop',t:5},{kind:'life',t:97},{kind:'drop',t:100},{kind:'drop',t:102},{kind:'drop',t:104}],104,110),{score:0,seconds:104,combo:0});
});
function adapter(db){return{prepare(sql){return{args:[],bind(...args){this.args=args;return this;},async first(){return db.prepare(sql).get(...this.args)||null;},async all(){return{results:db.prepare(sql).all(...this.args)};},async run(){return{meta:{changes:db.prepare(sql).run(...this.args).changes}};}};},async batch(stmts){db.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};}
test('authenticated results keep one best, reject replays and isolate user identity',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_auth.sql',import.meta.url),'utf8'));
 const env={DB:adapter(db)};await ensureSandy(env);
 for(const id of ['one','two']){db.prepare('INSERT INTO users(discord_id,username,display_name) VALUES (?,?,?)').run(id,id,id);db.prepare("INSERT INTO sessions(id_hash,discord_id,expires_at) VALUES (?,?,datetime('now','+1 day'))").run(await sha256(id),id);}
 const send=(body,cookie='one',origin='https://example.test')=>onRequestPost({env,request:new Request('https://example.test/api/sandy/run',{method:'POST',headers:{origin,cookie:'__Host-ufl_session='+cookie},body:JSON.stringify(body)})});
 assert.equal((await send({action:'start'},'bad')).status,401);assert.equal((await send({action:'start'},'one','https://bad.test')).status,403);
 assert.equal((await send(null)).status,400);
 for(const touches of [2,1,3]){
  const {id}=await(await send({action:'start'})).json();db.prepare('UPDATE sandy_runs SET started_at=started_at-30 WHERE id=?').run(id);
  const body={action:'finish',id,duration:14,events:[...Array.from({length:touches},(_,i)=>({kind:'touch',t:i+1})),...drops],score:999999};
  assert.equal((await send(body,'two')).status,409);
  assert.equal((await send(body)).status,200);
  assert.equal((await send(body)).status,409);
  const board=await(await onRequestGet({env})).json();assert.equal(board.entries.length,1);assert.equal(board.entries[0].score,Math.max(2,touches)*100);
 }
 db.prepare("UPDATE users SET status='suspended' WHERE discord_id='one'").run();
 assert.equal((await(await onRequestGet({env})).json()).entries.length,0);db.close();
});
