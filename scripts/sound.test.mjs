import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {normalizePlaylists,previewSoundApi} from '../functions/_lib/preview-sound.js';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../migrations/20261011_sound.sql',import.meta.url),'utf8'));
let actor = null;
const env = {DB:{prepare(sql){let params=[];return {
  bind(...values){params=values;return this;},
  async first(){return sql.includes('FROM sessions') ? actor : sqlite.prepare(sql).get(...params);},
  async run(){const r=sqlite.prepare(sql).run(...params);return {meta:{changes:Number(r.changes)}};}
};}}};
const seed = {title:'Test',description:'Community selection',url:'https://youtube.com/playlist?list=PLtestselection123&si=tracking'};
const call = (method='GET',data,origin='https://preview.example',extra={}) => previewSoundApi(new Request('https://preview.example/api/sound',{
  method,headers:{origin,'content-type':'application/json',cookie:'__Host-ufl_session=test',...extra},...(data===undefined?{}:{body:JSON.stringify(data)})
}),env);
assert.equal(normalizePlaylists([seed])[0].url,'https://www.youtube.com/playlist?list=PLtestselection123');
assert.throws(()=>normalizePlaylists([{...seed,url:'https://open.spotify.com/playlist/6iqa4OoxhBFrEBXAxul9cG'}]));
const youtube = {title:'YouTube test',description:'Full-track embed test',url:'https://youtube.com/playlist?list=OLAK5uy_mi3B8_JLj-ehEm2O6l6qKQWUoHqzPClBk&si=tracking'};
assert.equal(normalizePlaylists([youtube])[0].provider,'youtube');
assert.equal(normalizePlaylists([youtube])[0].url,'https://www.youtube.com/playlist?list=OLAK5uy_mi3B8_JLj-ehEm2O6l6qKQWUoHqzPClBk');
assert.equal(normalizePlaylists([{...youtube,url:youtube.url.replace('youtube.com','music.youtube.com')}])[0].provider,'youtube');
for(const url of ['https://youtube.com.evil.example/playlist?list=abcdefghijk','https://youtube.com/watch?list=abcdefghijk','https://youtube.com/playlist?list=abc','https://youtube.com/playlist?list=abcdefghijk&list=lmnopqrstuv','https://youtube.com/playlist?list=%22%3E%3Cscript%3E','http://youtube.com/playlist?list=abcdefghijk','https://youtube.com:444/playlist?list=abcdefghijk'])assert.throws(()=>normalizePlaylists([{...youtube,url}]));
assert.throws(()=>normalizePlaylists([youtube,{...youtube,url:youtube.url.replace('youtube.com','www.youtube.com')}])) ;
sqlite.exec(readFileSync(new URL('../migrations/20261011_sound_youtube.sql',import.meta.url),'utf8'));
let migrated=JSON.parse(sqlite.prepare('SELECT playlists FROM preview_sound_settings').get().playlists);
assert.equal(migrated.length,2);assert.ok(migrated[0].url.includes('youtube.com'));
sqlite.exec(readFileSync(new URL('../migrations/20261011_sound_youtube.sql',import.meta.url),'utf8'));
assert.equal(JSON.parse(sqlite.prepare('SELECT playlists FROM preview_sound_settings').get().playlists).length,2);
sqlite.exec(readFileSync(new URL('../migrations/20261011_sound_youtube_only.sql',import.meta.url),'utf8'));
const youtubeOnly = sqlite.prepare('SELECT revision,playlists FROM preview_sound_settings').get();
assert.equal(JSON.parse(youtubeOnly.playlists).length,1);
assert.ok(JSON.parse(youtubeOnly.playlists)[0].url.includes('youtube.com'));
sqlite.exec(readFileSync(new URL('../migrations/20261011_sound_youtube_only.sql',import.meta.url),'utf8'));
assert.equal(sqlite.prepare('SELECT revision FROM preview_sound_settings').get().revision,youtubeOnly.revision);
sqlite.prepare('UPDATE preview_sound_settings SET revision = 0 WHERE id = 1').run();
for(const url of ['https://evil.example/playlist/6iqa4OoxhBFrEBXAxul9cG','javascript:alert(1)','https://open.spotify.com.evil.example/playlist/6iqa4OoxhBFrEBXAxul9cG','https://user:password@open.spotify.com/playlist/6iqa4OoxhBFrEBXAxul9cG','https://open.spotify.com/track/6iqa4OoxhBFrEBXAxul9cG'])assert.throws(()=>normalizePlaylists([{...seed,url}]));
assert.throws(()=>normalizePlaylists([seed,seed]));
assert.throws(()=>normalizePlaylists(Array(6).fill(seed)));
assert.throws(()=>normalizePlaylists([{...seed,title:' '}])) ;
assert.throws(()=>normalizePlaylists([{...seed,description:'x'.repeat(241)}]));
assert.equal((await call()).status,200);
assert.equal((await call('POST',{revision:0,playlists:[seed]})).status,401);
actor = {discord_id:'admin-test',role:'player',status:'active'};
assert.equal((await call('POST',{revision:0,playlists:[seed]})).status,403);
actor.role='manager';assert.equal((await call('POST',{revision:0,playlists:[seed]})).status,403);
actor.role='admin';
assert.equal((await call('POST',{revision:0,playlists:[seed]},'https://evil.example')).status,403);
assert.equal((await call('POST',{revision:0,playlists:[seed]},'https://preview.example',{'content-type':'text/plain'})).status,415);
assert.equal((await call('POST',{revision:0,playlists:Array(6).fill(seed)})).status,400);
assert.equal((await call('POST',{revision:0,playlists:[{...seed,description:'a'.repeat(13000)}]})).status,413);
assert.equal((await call('DELETE')).status,405);
const first = await call('POST',{revision:0,playlists:[seed]});assert.equal(first.status,200);
assert.equal((await first.json()).revision,1);
assert.equal((await call('POST',{revision:0,playlists:[]})).status,409);
actor.role='owner';assert.equal((await call('POST',{revision:1,playlists:[]})).status,200);
assert.equal((await (await call()).json()).playlists.length,0);
const five = Array.from({length:5},(_,i)=>({...seed,title:`Playlist ${i}`,url:`https://www.youtube.com/playlist?list=PLtestselection${i}`}));
assert.equal((await call('POST',{revision:2,playlists:five})).status,200);
assert.throws(()=>sqlite.prepare('UPDATE preview_sound_settings SET playlists = ?').run(JSON.stringify([...five,seed])));
assert.equal((await (await call()).json()).playlists.length,5);
const page = readFileSync(new URL('../sound-page.js',import.meta.url),'utf8');
assert.ok(page.includes('encrypted-media; fullscreen; picture-in-picture'));
assert.ok(!page.includes('autoplay=1'));
assert.ok(page.includes('data-load'));
assert.ok(page.includes('https://www.youtube-nocookie.com/embed/videoseries?list='));
assert.ok(page.includes("frame.referrerPolicy = 'strict-origin-when-cross-origin'"));
assert.ok(!/spotify/i.test(page));
const headers=readFileSync(new URL('../_headers',import.meta.url),'utf8');assert.ok(!headers.includes('open.spotify.com'));
assert.equal((await call('POST',{revision:3,playlists:[{...seed,url:'https://open.spotify.com/playlist/6iqa4OoxhBFrEBXAxul9cG'}]})).status,400);
assert.equal((await call('POST',{revision:3,playlists:[youtube,seed]})).status,200);
assert.equal((await (await call()).json()).playlists[0].provider,'youtube');
sqlite.close();
console.log('Sound tests passed: roles, CSRF, YouTube-only allowlist, Spotify rejection/removal, album IDs, migrations, five-slot DB guard, stale writes, click-to-load.');
