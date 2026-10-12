import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {File} from 'node:buffer';
import {coachingApi,validateGuide} from '../functions/_lib/coaching.js';
import {onRequestGet as shell} from '../functions/coaching.js';
import {onRequest as middleware} from '../functions/api/_middleware.js';

function setup(){
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  db.exec(fs.readFileSync(new URL('../migrations/0001_auth.sql',import.meta.url),'utf8'));
  const migration=fs.readFileSync(new URL('../migrations/20261011_coaching.sql',import.meta.url),'utf8');db.exec(migration);
  for(const id of ['alice','bob','staff'])db.prepare('INSERT INTO users(discord_id,username,display_name) VALUES(?,?,?)').run(id,id,id);
  let actor=null;const objects=new Map(),deleted=[];
  const env={DB:{prepare(sql){const stmt={sql,params:[],bind(...args){this.params=args;return this;},async first(){return sql.includes('FROM sessions')?actor:db.prepare(sql).get(...this.params);},async all(){return{results:db.prepare(sql).all(...this.params)};},async run(){return{meta:{changes:Number(db.prepare(sql).run(...this.params).changes)}};}};return stmt;},async batch(statements){db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}}},PLAYER_PHOTOS:{async put(key,bytes){objects.set(key,bytes);},async get(key){return objects.has(key)?{body:objects.get(key)}:null;},async delete(key){deleted.push(key);objects.delete(key);}}};
  const act=(id,role='member',status='active')=>{actor=id?{discord_id:id,role,status}:null;};
  const call=(method='GET',body,id=null,operation=null,origin='https://site.test',query='')=>coachingApi(new Request(`https://site.test/api/coaching${id?'/'+id:''}${operation?'/'+operation:''}${query}`,{method,headers:{origin,cookie:'__Host-ufl_session=qa',...(body instanceof FormData?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})}),env,id,operation);
  const png=()=>{const bytes=new Uint8Array(32);bytes.set([137,80,78,71,13,10,26,10]);bytes.set([73,72,68,82],12);return new File([bytes],'cover.png',{type:'image/png'});};
  const guide=(changes={},image=true)=>{const form=new FormData();for(const [k,v] of Object.entries({title:'QA only',hook:'Not published to live',body:'First paragraph.\n\nSecond paragraph.',...changes}))form.set(k,v);if(image)form.set('cover',png());return form;};
  return{db,env,objects,deleted,act,call,guide,migration};
}

test('Coaching starts empty and rejects anonymous, suspended and cross-origin writes',async()=>{
  const {call,act,guide,db,migration}=setup();
  assert.deepEqual((await(await call()).json()).posts,[]);db.exec(migration);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM coaching_posts').get().n,0);
  assert.equal((await call('POST',guide())).status,401);
  act('alice','member','suspended');assert.equal((await call('POST',guide())).status,401);
  act('alice');assert.equal((await call('POST',guide(),null,null,'https://evil.test')).status,403);
  assert.equal((await call('GET',undefined,null,null,'https://site.test','?view=moderation')).status,403);
  assert.equal((await call('GET',undefined,'../../bad')).status,404);
  assert.equal((await call('GET',undefined,null,null,'https://site.test','?page=-1')).status,400);
  assert.equal((await call('DELETE')).status,405);db.close();
});

test('Members publish and edit their own guide, keep hearts, and cannot edit anyone else',async()=>{
  const {call,act,guide,db,objects,deleted}=setup();act('alice');
  const created=await call('POST',guide({author_id:'bob'}));assert.equal(created.status,201);let post=(await created.json()).post;
  assert.equal(post.author,'alice');assert.equal(post.canEdit,true);assert.equal(objects.size,1);
  act('bob');assert.equal((await call('POST',guide({revision:0}),post.id)).status,403);
  assert.equal((await call('POST',{hearted:true},post.id,'heart')).status,200);
  await call('POST',{hearted:true},post.id,'heart');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM coaching_hearts').get().n,1);
  act('alice');assert.equal((await call('POST',guide({revision:0,title:'Updated'}),post.id)).status,200);assert.equal(objects.size,1);assert.equal(deleted.length,1);
  const after=(await(await call('GET',undefined,post.id)).json()).post;assert.equal(after.hearts,1);assert.equal(after.title,'Updated');assert.equal(after.revision,1);
  assert.equal((await call('POST',guide({revision:0}),post.id)).status,409);assert.equal(objects.size,1);
  assert.equal((await call('POST',guide({revision:1,title:'No new image'},false),post.id)).status,200);assert.equal(objects.size,1);
  act('bob');await call('POST',{hearted:false},post.id,'heart');await call('POST',{hearted:false},post.id,'heart');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM coaching_hearts').get().n,0);
  db.close();
});

test('Moderation hides guides and covers, author edits cannot unhide, soft deletion is protected',async()=>{
  const {call,act,guide,db}=setup();act('alice');const post=(await(await call('POST',guide())).json()).post;
  assert.equal((await call('POST',guide({revision:0,action:'hide'},false),post.id)).status,403);
  act('staff','admin');assert.equal((await call('POST',guide({revision:0}),post.id)).status,403);
  assert.equal((await call('POST',guide({revision:0,action:'hide'},false),post.id)).status,200);
  act(null);assert.equal((await call('GET',undefined,post.id)).status,404);assert.equal((await call('GET',undefined,post.id,'cover')).status,404);assert.equal((await(await call()).json()).posts.length,0);
  act('alice');assert.equal((await call('POST',guide({revision:1},false),post.id)).status,200);assert.equal((await(await call('GET',undefined,post.id)).json()).post.status,'hidden');
  assert.equal((await call('POST',{hearted:true},post.id,'heart')).status,400);
  assert.equal((await(await call('GET',undefined,null,null,'https://site.test','?view=mine')).json()).posts.length,1);
  act('staff','owner');assert.equal((await(await call('GET',undefined,null,null,'https://site.test','?view=moderation')).json()).posts.length,1);
  assert.equal((await call('POST',guide({revision:1,action:'restore'},false),post.id)).status,409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM coaching_moderation').get().n,1);
  assert.equal((await call('POST',guide({revision:2,action:'restore'},false),post.id)).status,200);
  act(null);assert.equal((await call('GET',undefined,post.id,'cover')).status,200);
  act('bob');assert.equal((await call('POST',guide({revision:3,action:'delete'},false),post.id)).status,403);
  act('alice');assert.equal((await call('POST',guide({revision:3,action:'delete'},false),post.id)).status,200);
  assert.equal((await call('GET',undefined,post.id)).status,404);assert.equal(db.prepare('SELECT status FROM coaching_posts').get().status,'deleted');db.close();
});

test('Validation, image type and streaming limits prevent unsafe or oversized uploads; rate limits apply',async()=>{
  assert.throws(()=>validateGuide({title:'',hook:'a',body:'b'}));assert.throws(()=>validateGuide({title:'a',hook:'x'.repeat(221),body:'b'}));assert.throws(()=>validateGuide({title:'a',hook:'b',body:'x'.repeat(30001)}));
  const {call,act,guide,objects,env,db}=setup();act('alice');
  assert.equal((await call('POST',guide({},false))).status,400);
  const spoof=guide();spoof.set('cover',new File(['<svg onload="alert(1)"/>'],'cover.png',{type:'image/png'}));assert.equal((await call('POST',spoof)).status,400);assert.equal(objects.size,0);
  const huge=new Request('https://site.test/api/coaching',{method:'POST',headers:{origin:'https://site.test',cookie:'__Host-ufl_session=qa','content-type':'multipart/form-data; boundary=x'},body:'x'.repeat(5*1024*1024+131073)});assert.equal((await coachingApi(huge,env)).status,413);assert.equal(objects.size,0);
  for(let i=0;i<8;i++)await call('POST',guide({},false));assert.equal((await call('POST',guide())).status,429);db.close();
});

test('Pagination is bounded, newest first, and never exposes another member’s hidden posts',async()=>{
  const {call,act,guide,db}=setup();act('alice');const first=(await(await call('POST',guide())).json()).post;
  const seed=db.prepare('INSERT INTO coaching_posts(id,author_id,title,hook,body,cover_key,cover_type,status,created_at) VALUES(?,?,?,?,?,?,?,?,?)');
  for(let i=0;i<13;i++)seed.run(crypto.randomUUID(),'bob',`QA ${i}`,'Hook','Body','coaching/test','image/png',i===12?'hidden':'published',`2030-01-${String(i+1).padStart(2,'0')} 00:00:00`);
  const feed=(await(await call()).json());assert.equal(feed.posts.length,12);assert.equal(feed.hasMore,true);assert.equal(feed.posts[0].title,'QA 11');assert.equal(feed.posts[0].body,undefined);assert.equal(feed.posts[0].author_id,undefined);
  const next=(await(await call('GET',undefined,null,null,'https://site.test','?page=2')).json());assert.equal(next.posts.length,1);assert.equal(next.posts[0].id,first.id);assert.equal(next.hasMore,false);
  assert.equal((await(await call('GET',undefined,null,null,'https://site.test','?view=mine')).json()).posts.length,1);db.close();
});

test('Shell deep links preserve coaching routing and API middleware permits bounded cover uploads',async()=>{
  let fetched;const env={ASSETS:{async fetch(request){fetched=request.url;return new Response('shell');}}};
  const response=await shell({request:new Request('https://site.test/coaching/new'),env});assert.equal(await response.text(),'shell');assert.equal(fetched,'https://site.test/');
  const trailing=await shell({request:new Request('https://site.test/coaching/new/'),env});assert.equal(trailing.headers.get('location'),'https://site.test/coaching/new');
  const check=length=>middleware({request:new Request('https://site.test/api/coaching',{method:'POST',headers:{'content-length':String(length)}}),next:async()=>new Response('ok')});
  assert.equal((await check(5*1024*1024)).status,200);assert.equal((await check(5*1024*1024+131073)).status,413);
});

test('Coaching UI escapes user content, uses three rounded cards, and production seeds no guides',()=>{
  const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const js=read('coaching-page.js');assert.match(js,/esc\(post.body\)/);assert.match(js,/esc\(post.title\)/);assert.match(js,/No guides have been posted yet/);assert.doesNotMatch(js,/\.innerHTML\s*=\s*post\./);
  assert.match(read('coaching-page.css'),/repeat\(3,minmax\(0,1fr\)\)/);assert.match(read('coaching-page.css'),/border-radius:22px/);
  assert.doesNotMatch(read('migrations/20261011_coaching.sql'),/INSERT INTO/i);assert.match(read('index.html'),/href="\/coaching"/);assert.match(read('app.js'),/window.hydrateCoaching/);
});
