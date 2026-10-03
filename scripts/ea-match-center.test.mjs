import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { onRequestGet as listClubs } from '../functions/api/admin/ea-clubs.js';
import { onRequestGet as listMatches } from '../functions/api/admin/ea-clubs/[clubId]/matches.js';

const actor = { discord_id:'owner-id', username:'owner', display_name:'Owner', avatar_url:null, role:'owner', status:'active', created_at:'2026-09-29' };
const database = user => ({ prepare:()=>({ bind:()=>({ first:async()=>user }) }) });
const request = path => new Request(`https://example.test${path}`, { headers:{ cookie:'__Host-ufl_session=test-token' } });

test('EA Match Center APIs reject non-admin visitors', async () => {
  const response = await listClubs({ request:new Request('https://example.test/api/admin/ea-clubs'), env:{ DB:database(null), OWNER_DISCORD_ID:'owner-id' } });
  assert.equal(response.status, 403);
});

test('EA Match Center exposes the reserved channel while waiting for UFB', async () => {
  const response = await listClubs({ request:request('/api/admin/ea-clubs'), env:{ DB:database(actor), OWNER_DISCORD_ID:'owner-id' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { channelId:'1520080337806299181', connected:false, connection:'awaiting_bot', clubs:[] });
});

test('EA Match Center uses the private UFB binding for linked clubs', async () => {
  let serviceRequest;
  const env={ DB:database(actor), OWNER_DISCORD_ID:'owner-id', UFB_EA_CHANNEL_ID:'1520080337806299181', UFB_BOT:{ fetch:async incoming=>{serviceRequest=incoming;return Response.json({clubs:[{id:'team-1',name:'UFL Test',league:'Season 2 6v6',eaClubId:'ea-1',eaClubName:'Test Club',platform:'common-gen5'}]});} } };
  const response=await listClubs({request:request('/api/admin/ea-clubs'),env});
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(body.connection,'connected');
  assert.equal(body.clubs[0].eaClubId,'ea-1');
  assert.equal(new URL(serviceRequest.url).pathname,'/admin/linked-clubs');
  assert.equal(new URL(serviceRequest.url).searchParams.get('channelId'),'1520080337806299181');
  assert.equal(serviceRequest.headers.get('x-ufl-channel-id'),'1520080337806299181');
});

test('EA Match Center retrieves recent matches only through a linked bot team id', async () => {
  let servicePath='';
  const env={ DB:database(actor), OWNER_DISCORD_ID:'owner-id', UFB_BOT:{ fetch:async incoming=>{servicePath=new URL(incoming.url).pathname;return Response.json({club:{id:'team-1',name:'UFL Test'},matches:[{id:'match-1',playedAt:1790000000000,type:'leagueMatch',clubs:[]}]});} } };
  const response=await listMatches({request:request('/api/admin/ea-clubs/team-1/matches'),env,params:{clubId:'team-1'}});
  const body=await response.json();
  assert.equal(response.status,200);
  assert.equal(servicePath,'/admin/linked-clubs/team-1/matches');
  assert.equal(body.matches[0].id,'match-1');
  const invalid=await listMatches({request:request('/api/admin/ea-clubs/bad/matches'),env,params:{clubId:'../bad'}});
  assert.equal(invalid.status,400);
});

test('admin UI includes the protected EA Match Center path and waiting state', async () => {
  const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.match(source,/data-admin-tab="ea-matches"/);
  assert.match(source,/\/admin\?tab=ea-matches/);
  assert.match(source,/Waiting for UFB in the Discord channel/);
});
test('match table maps UFB slots correctly and safely supports legacy four-field results',async()=>{
  const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
  const start=source.indexOf('function eaMatchPlayerRow('),end=source.indexOf('\nfunction adminEaMatchResults(',start);
  const escapeHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const context=vm.createContext({escapeHtml});vm.runInContext(source.slice(start,end),context);
  const row=context.eaMatchPlayerRow({name:'<Test>',motm:true,stats:['MID','8.4','2','9','3','—','—','—','—','24 / 30 (80%)','2 / 4 (50%)','5','—','0']});
  assert.match(row,/&lt;Test&gt;/);assert.match(row,/Man of the Match/);
  assert.deepEqual([...row.matchAll(/<td>([^<]*)<\/td>/g)].map(m=>m[1]),['','MID','8.4','2','9','3','24 / 30 (80%)','2 / 4 (50%)','5','0']);
  const legacy=context.eaMatchPlayerRow({stats:['MID','8.4','2','3']});assert.match(legacy,/<td>2<\/td><td>—<\/td><td>3<\/td>/);
  for(const label of ['Goals','Shots','Assists','Passes','Tackles','Interceptions','Saves'])assert.ok(source.includes(`>${label}`));
});
