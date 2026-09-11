import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createGame,step,replay,pace,DT,GROUND,X} from '../goose-app/engine.mjs';
import {ensureGoose} from '../functions/_lib/goose.js';
import {sha256} from '../functions/_lib/auth.js';
import {onRequestPost,onRequestPatch} from '../functions/api/goose/run.js';
import {onRequestGet} from '../functions/api/goose/leaderboard.js';
function adapter(sqlite){return {prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){const r=sqlite.prepare(sql).run(...this.args);return {meta:{changes:r.changes}};}};},async batch(stmts){sqlite.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};}

test('checkpoint replay preserves every result and random obstacle state',()=>{
 let client=createGame(197),server=createGame(197),packet=[];
 for(let i=0;i<12000&&!client.over;i++){const input=(i%93===0?2:0)|(i%220>70?1:0);step(client,input);packet.push([input,1]);if(packet.length===300||client.over){server=replay(JSON.parse(JSON.stringify(server)),packet).game;assert.deepEqual(server,client);packet=[];}}
 assert.equal(client.over,true);
 for(const steps of [[['score',10000]],[[4,1]],[[2,20]],[[0,1201]],[[0,-1]],[]])assert.throws(()=>replay(createGame(1),steps));
});
test('double-jump clears lakes at increasing speeds, mode earns honks, speed stays uncapped',()=>{
 for(const seconds of [0,45,95])for(const glide of [false,true]){const g=createGame(7);g.time=seconds;g.spawn=999;g.objects=[{x:X+38,y:GROUND-6,w:Math.round(265*pace(g)*.95),h:86,type:'lake'}];for(let i=0;i<220&&!g.over;i++)step(g,(i===0||i===46?2:0)|(i>=46&&glide?1:0));assert.equal(g.over,false);}
 const g=createGame(1);g.objects=[0,1,2].map(()=>({x:X,y:g.y,w:20,h:30,type:'can'}));step(g,0);assert.equal(g.mode,6);assert.equal(g.objects.filter(o=>o.type==='defender').length,4);
 g.objects=[{x:X,y:g.y,w:40,h:40,type:'defender'}];step(g,0);assert.equal(g.honks,1);
 g.objects=[{x:X,y:g.y,w:40,h:40,type:'lake'}];step(g,0);assert.equal(g.honks,1);g.time=200;assert.ok(pace(g)>2.04);
});
test('authenticated runs save one best with all four verified stats and reject forged requests',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_auth.sql',import.meta.url),'utf8'));const env={DB:adapter(db)};await ensureGoose(env);
 db.prepare('INSERT INTO users(discord_id,username,display_name) VALUES (?,?,?)').run('tester','goose','Goose Tester');
 db.prepare("INSERT INTO sessions(id_hash,discord_id,expires_at) VALUES (?,?,datetime('now','+1 day'))").run(await sha256('token'),'tester');
 const request=(method,body={},cookie='token',origin='https://example.test')=>new Request('https://example.test/api/goose/run',{method,headers:{origin,'content-type':'application/json',cookie:'__Host-ufl_session='+cookie},body:JSON.stringify(body)});
 assert.equal((await onRequestPost({env,request:request('POST',{},'bad')})).status,401);
 assert.equal((await onRequestPost({env,request:request('POST',{},'token','https://bad.test')})).status,403);
 for(let run=0;run<2;run++){
 const begin=await(await onRequestPost({env,request:request('POST')})).json();const g=createGame(begin.seed);
 assert.equal((await onRequestPatch({env,request:request('PATCH',{id:begin.id,seq:0,steps:[['score',99999]]})})).status,400);
 db.prepare('UPDATE goose_runs SET started_at=started_at-60 WHERE id=?').run(begin.id);
 let seq=0,packet=[];while(!g.over){step(g,0);packet.push([0,1]);if(packet.length===600||g.over){const response=await onRequestPatch({env,request:request('PATCH',{id:begin.id,seq:seq++,steps:packet,score:999999,honks:99999})});assert.equal(response.status,200,await response.clone().text());packet=[];}}
 const board=await(await onRequestGet({env})).json();assert.equal(board.entries.length,1);const row=board.entries[0];assert.equal(row.score,Math.floor(g.score));assert.equal(row.distance,Math.floor(g.distance));assert.equal(row.pace,Number(pace(g).toFixed(2)));assert.equal(row.honks,g.honks);
 assert.equal((await onRequestPatch({env,request:request('PATCH',{id:begin.id,seq,steps:[[0,1]]})})).status,409);
 }
 db.close();
});
