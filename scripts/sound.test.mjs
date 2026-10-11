import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {normalizePlaylists,soundApi} from '../functions/_lib/sound.js';

test('Sound launches empty, authorizes admins, validates YouTube and prevents lost edits',async()=>{
  const db=new DatabaseSync(':memory:');
  const migration=fs.readFileSync(new URL('../migrations/20261011_sound.sql',import.meta.url),'utf8');db.exec(migration);
  let actor=null;
  const env={DB:{prepare(sql){let params=[];return{bind(...p){params=p;return this;},async first(){return sql.includes('FROM sessions')?actor:db.prepare(sql).get(...params);},async run(){return{meta:{changes:Number(db.prepare(sql).run(...params).changes)}};}};}}};
  const call=(method='GET',data,origin='https://www.uncfutbolleague.com')=>soundApi(new Request('https://www.uncfutbolleague.com/api/sound',{method,headers:{origin,'content-type':'application/json',cookie:'__Host-ufl_session=test'},...(data===undefined?{}:{body:JSON.stringify(data)})}),env);
  const album={title:'Album',description:'Test only',url:'https://music.youtube.com/playlist?list=OLAK5uy_mi3B8_JLj-ehEm2O6l6qKQWUoHqzPClBk&si=tracking'};
  assert.deepEqual((await(await call()).json()).playlists,[]);
  assert.equal(normalizePlaylists([album])[0].url,'https://www.youtube.com/playlist?list=OLAK5uy_mi3B8_JLj-ehEm2O6l6qKQWUoHqzPClBk');
  for(const url of ['https://open.spotify.com/playlist/6iqa4OoxhBFrEBXAxul9cG','javascript:alert(1)','https://youtube.com.evil.example/playlist?list=PLtest123456','https://youtube.com/playlist?list=abc','https://user:pass@youtube.com/playlist?list=PLtest123456','https://youtube.com/playlist?list=PLtest123456&list=PLother123456'])assert.throws(()=>normalizePlaylists([{...album,url}]));
  assert.throws(()=>normalizePlaylists([album,album]));
  assert.throws(()=>normalizePlaylists(Array(6).fill(album)));
  assert.equal((await call('POST',{revision:0,playlists:[album]})).status,401);
  actor={discord_id:'staff',role:'manager',status:'active'};assert.equal((await call('POST',{revision:0,playlists:[album]})).status,403);
  actor.role='player';assert.equal((await call('POST',{revision:0,playlists:[album]})).status,403);
  actor.role='admin';assert.equal((await call('POST',{revision:0,playlists:[album]},'https://evil.example')).status,403);
  assert.equal((await call('POST',{revision:0,playlists:[{...album,description:'x'.repeat(13000)}]})).status,413);
  assert.equal((await call('POST',{revision:0,playlists:[album]})).status,200);
  assert.equal((await call('POST',{revision:0,playlists:[]})).status,409);
  db.exec(migration);assert.equal(JSON.parse(db.prepare('SELECT playlists FROM sound_settings').get().playlists).length,1);
  actor.role='owner';assert.equal((await call('POST',{revision:1,playlists:[]})).status,200);
  const five=Array.from({length:5},(_,i)=>({...album,url:`https://youtube.com/playlist?list=PLtestselection${i}`}));
  assert.equal((await call('POST',{revision:2,playlists:five})).status,200);
  assert.throws(()=>db.prepare('UPDATE sound_settings SET playlists=?').run(JSON.stringify([...five,album])));
  assert.equal((await call('DELETE')).status,405);db.close();
});

test('Sound UI has Coming soon, no test content or Spotify, and guarded click-to-load embeds',()=>{
  const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const js=read('sound-page.js');assert.match(js,/Coming soon/);assert.match(js,/The soundtrack is on its way/);
  assert.doesNotMatch(js,/Spotify|test realm|6iqa4|OLAK5uy_mi3/i);assert.match(js,/youtube-nocookie\.com/);assert.doesNotMatch(js,/autoplay=1/);
  assert.match(read('app.js'),/status:'Coming soon'/);assert.match(read('index.html'),/Coming soon · The clubhouse soundtrack/);
  assert.match(read('functions/api/sound.js'),/soundApi/);assert.match(read('functions/sound.js'),/env.ASSETS.fetch/);
});
