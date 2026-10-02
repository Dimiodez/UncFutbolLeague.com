import test from 'node:test';
import assert from 'node:assert/strict';
import {handleBridge,normalizeMatches} from '../bot-match-bridge/index.mjs';
const guild='1520080337806299181';
const club={id:25,name:'Toluca',league:'UFL Season 2 - 6v6',ea_club_id:'1197975',ea_platform:'common-gen5'};
const request=(path='/admin/linked-clubs')=>new Request(`https://ufb.internal${path}?channelId=${guild}`,{headers:{'x-ufl-channel-id':guild}});
function env(row=club){return {UFL_GUILD_ID:guild,EA_API_BASE_URL:'https://proclubs-api.onrender.com/api',BOT_DB:{prepare(sql){assert.match(sql,/archived_at IS NULL/);assert.match(sql,/t\.unassigned=0/);assert.doesNotMatch(sql,/\b(INSERT|UPDATE|DELETE)\b/i);return {bind(...values){assert.deepEqual(values.slice(0,3),[guild,'ufl-season-2-6v6','ufl-season-2-10v10']);return {all:async()=>({results:[row]}),first:async()=>row};}};}}};}
const raw=[{matchId:'m1',timestamp:1790000000,clubs:{1197975:{name:'Toluca',goals:4},222:{name:'Opponent',goals:1}},players:{1197975:{p1:{name:'Tester',rating:8.4,goals:2,shots:9,assists:3,position:'midfielder'}}}}];
test('bridge lists linked clubs only from the configured guild and two leagues',async()=>{
  const r=await handleBridge(request(),env());assert.equal(r.status,200);const body=await r.json();assert.equal(body.clubs[0].eaClubId,'1197975');
});
test('private bridge rejects missing scope, writes and unknown clubs',async()=>{
  assert.equal((await handleBridge(new Request('https://example.com/admin/linked-clubs'),{})).status,403);
  assert.equal((await handleBridge(new Request(request(),{method:'POST'}),{})).status,405);
  assert.equal((await handleBridge(request('/admin/linked-clubs/1/matches'),env(null),()=>{throw new Error('Should not fetch');})).status,404);
});
test('EA normalization keeps assists separate from shots and filters unrelated matches',()=>{
  const matches=normalizeMatches(raw,'leagueMatch','1197975');assert.equal(matches[0].playedAt,1790000000000);assert.deepEqual(matches[0].clubs.find(c=>c.id==='1197975').players[0].stats,['MID','8.4','2','3']);assert.equal(normalizeMatches(raw,'leagueMatch','different').length,0);
});
test('bridge deduplicates match types and marks partial feed failures',async()=>{
  const r=await handleBridge(request('/admin/linked-clubs/25/matches'),env(),async url=>url.searchParams.get('type')==='playoffMatch'?new Response(null,{status:503}):Response.json(raw));const body=await r.json();assert.equal(r.status,200);assert.equal(body.matches.length,1);assert.equal(body.partial,true);
  assert.equal((await handleBridge(request('/admin/linked-clubs/25/matches'),env(),async()=>new Response(null,{status:503}))).status,502);
});
