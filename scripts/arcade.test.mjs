import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {initialGame,replay,ensureArcade} from '../functions/_lib/arcade.js';
import {update,launch,advance} from '../arcade-app/engine.mjs';
import {sha256} from '../functions/_lib/auth.js';
import {onRequestPost,onRequestPatch} from '../functions/api/arcade/run.js';
import {onRequestGet} from '../functions/api/arcade/leaderboard.js';
function adapter(sqlite){return {prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return sqlite.prepare(sql).get(...this.args)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.args)};},async run(){const r=sqlite.prepare(sql).run(...this.args);return {meta:{changes:r.changes}};}};},async batch(stmts){sqlite.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};}
test('server replay matches browser physics across checkpoint boundaries',()=>{let client=initialGame('como',47),server=initialGame('como',47),steps=[];for(let i=0;i<50000;i++){if(['won','over'].includes(client.phase))break;if(client.phase==='ready'){steps.push(['launch']);launch(client);}if(client.phase==='levelup'){steps.push(['advance']);advance(client);}const target=Math.max(0,Math.min(640,Math.round(client.ball.x+Math.sin(i*.004)*20)));steps.push([target,1]);update(client,1/120,target);client.events=[];if(steps.length>=400){server=replay(JSON.parse(JSON.stringify(server)),steps).game;steps=[];assert.equal(server.score,client.score);assert.equal(server.ball.x,client.ball.x);assert.equal(server.opponent,client.opponent);}}server=replay(server,steps).game;assert.equal(server.score,client.score);assert.equal(server.lives,client.lives);});
test('forged score actions, jumps and oversized packets are rejected',()=>{for(const steps of [[['score',999999]],[['advance']],[[320,1201]],[[NaN,1]],[['aim',-10]]])assert.throws(()=>replay(initialGame('como',1),steps));});
test('authenticated endpoint verifies runs, enforces identity and keeps one best',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_auth.sql',import.meta.url),'utf8'));const env={DB:adapter(db)};await ensureArcade(env);const cookie='test-session';db.prepare('INSERT INTO users(discord_id,username,display_name) VALUES (?,?,?)').run('test-user','tester','Arcade Tester');db.prepare("INSERT INTO sessions(id_hash,discord_id,expires_at) VALUES (?,?,datetime('now','+1 day'))").run(await sha256(cookie),'test-user');
 const request=(method,body,authenticated=true,origin='https://example.test')=>new Request('https://example.test/api/arcade/run',{method,headers:{origin,'content-type':'application/json',...(authenticated?{cookie:'__Host-ufl_session='+cookie}:{})},body:JSON.stringify(body)});
 assert.equal((await onRequestPost({env,request:request('POST',{team:'como'},false)})).status,401);
 assert.equal((await onRequestPost({env,request:request('POST',{team:'como'},true,'https://bad.test')})).status,403);
 assert.equal((await onRequestPost({env,request:request('POST',{team:'__proto__'})})).status,400);
 const begin=await (await onRequestPost({env,request:request('POST',{team:'como'})})).json();
 const client=initialGame('como',begin.seed);let seq=0,packet=[];let lastResponse;
 // Stand still and play three genuine balls. Adjust start time only in the test DB.
 db.prepare('UPDATE arcade_runs SET started_at=started_at-600 WHERE id=?').run(begin.id);
 for(let i=0;i<50000&&!['over','won'].includes(client.phase);i++){if(client.phase==='ready'){packet.push(['launch']);launch(client);}if(client.phase==='levelup'){packet.push(['advance']);advance(client);}packet.push([70,1]);update(client,1/120,70);client.events=[];if(packet.length>=500||['over','won'].includes(client.phase)){lastResponse=await onRequestPatch({env,request:request('PATCH',{id:begin.id,seq:seq++,steps:packet})});assert.equal(lastResponse.status,200);packet=[];}}
 assert.equal(client.phase,'over');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM arcade_bests').get().n,1);
 const board=await (await onRequestGet({env})).json();assert.equal(board.entries[0].score,client.score);assert.equal(board.entries[0].team,'CMO');
 assert.equal((await onRequestPatch({env,request:request('PATCH',{id:begin.id,seq:0,steps:[]})})).status,409);
 // Exercise the same upsert: lower results preserve the entry; higher replace it.
 const upsert=db.prepare("INSERT INTO arcade_bests(discord_id,version,team,score,level,achieved_at) VALUES ('test-user','cleat-v1',?,?,1,1) ON CONFLICT(discord_id,version) DO UPDATE SET score=excluded.score,team=excluded.team WHERE excluded.score>arcade_bests.score");
 upsert.run('PAL',client.score+100);upsert.run('GC',0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM arcade_bests').get().n,1);assert.equal(db.prepare('SELECT team FROM arcade_bests').get().team,'PAL');db.close();
});

 test('chosen trajectory is replayed and available after every reset',async()=>{
 const {resetBall,awardGoal,loadLevel,ballSpeed}=await import('../arcade-app/engine.mjs');
 for(const reset of [g=>{},resetBall,awardGoal,g=>{g.level=7;loadLevel(g);}]){const g=initialGame('como',13);reset(g);for(const angle of [-60,0,60]){resetBall(g);const copy=JSON.parse(JSON.stringify(g));launch(g,angle);const verified=replay(copy,[['launch',angle]]).game;assert.equal(verified.ball.vx,g.ball.vx);assert.equal(Math.sign(g.ball.vx),Math.sign(angle));assert.ok(g.ball.vy<0);assert.ok(Math.abs(Math.hypot(g.ball.vx,g.ball.vy)-ballSpeed(g))<.001);}}
 for(const angle of [-61,61,null,'30'])assert.throws(()=>replay(initialGame('como',1),[['launch',angle]]));
 });

test('level 13 overlaps award two goals and double-netter; a single net awards one',async()=>{
 const {loadLevel,goalCenters,LEVELS,awardGoal}=await import('../arcade-app/engine.mjs');
 assert.equal(LEVELS.length,13);
 const g=initialGame('como',71);g.level=12;loadLevel(g);
 const defenders=g.blocks.filter(b=>b.type==='defender'),buses=g.blocks.filter(b=>b.type==='bus');
 assert.ok(defenders.every(d=>buses.every(b=>d.y>b.y+b.h)));
 for(const overlap of [true,false]){
   let time=0,centers;
   for(;time<20;time+=.01){g.time=time;centers=goalCenters(g);if((Math.abs(centers[0]-centers[1])<20)===overlap)break;}
   g.phase='playing';g.score=0;g.goals=0;g.events=[];g.ball={x:overlap?(centers[0]+centers[1])/2:centers[0],y:48,vx:0,vy:-620,spin:0};
   const server=replay(JSON.parse(JSON.stringify(g)),[[320,1]]).game;
   update(g,1/120,320);
   assert.equal(g.goals,overlap?2:1);assert.equal(g.score,overlap?1000:500);
   assert.equal(g.events.includes('double-netter'),overlap);assert.equal(server.score,g.score);
 }
 g.level=11;g.goals=LEVELS[11].goals-1;awardGoal(g);assert.equal(g.phase,'levelup');
 advance(g);assert.equal(g.level,12);g.goals=6;awardGoal(g,2);assert.equal(g.phase,'won');
});

test('owner test mode disconnects score recording and checks the owner role',async()=>{
 const source=readFileSync(new URL('../arcade-app/ranked.mjs',import.meta.url),'utf8');
 const harness=`const calls=[];let role='owner';const document={querySelector:()=>({addEventListener(){},textContent:''})};const fetch=async(path,options)=>{calls.push(path);return {ok:true,json:async()=>path.includes('session')?{authenticated:true,user:{role,displayName:'Tester'}}:{id:'test',seed:5}};};export {calls};export function setRole(value){role=value;}`;
 const ranked=await import('data:text/javascript;base64,'+Buffer.from(harness+source).toString('base64'));
 assert.equal(await ranked.ownerSession(),true);ranked.setRole('admin');assert.equal(await ranked.ownerSession(),false);
 await ranked.beginRun('como');ranked.discardRun();const before=ranked.calls.length;
 ranked.record(['launch',20]);ranked.record([320,600]);ranked.flush(true);
 await Promise.resolve();assert.equal(ranked.calls.length,before);
});
