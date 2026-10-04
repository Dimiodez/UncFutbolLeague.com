import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/club-analytics/[clubId].js';
import {sha256} from '../functions/_lib/auth.js';

const token='test-session';
const hash=await sha256(token);
const request=()=>new Request('https://www.uncfutbolleague.com/api/club-analytics/374656',{headers:{cookie:`__Host-ufl_session=${token}`}});
function env(user,service){return {OWNER_DISCORD_ID:'100000000000000',DB:{prepare(){return {bind(value){assert.equal(value,hash);return {first:async()=>user};}};}},UFB_BOT:service,UFB_EA_CHANNEL_ID:'1520080337806299181'};}

test('signed-out visitors receive no private analytics payload',async()=>{
  const response=await onRequestGet({request:request(),env:env(null),params:{clubId:'374656'}});
  assert.equal(response.status,401);assert.equal('analytics' in await response.json(),false);
});

test('owner receives analytics without team-membership lookup',async()=>{
  const user={discord_id:'100000000000000',role:'member',status:'active'};
  const response=await onRequestGet({request:request(),env:env(user),params:{clubId:'374656'}});
  const body=await response.json();assert.equal(response.status,200);assert.equal(body.access.role,'owner');assert.equal(body.analytics.club.name,'UFL Maykop');
});

test('registered player is authorized by the private bot bridge',async()=>{
  const user={discord_id:'200000000000000',role:'member',status:'active'};
  const service={fetch:async req=>{assert.match(req.url,/club-access\/374656/);assert.match(req.url,/discordId=200000000000000/);return Response.json({allowed:true,role:'player'});}};
  const response=await onRequestGet({request:request(),env:env(user,service),params:{clubId:'374656'}});
  assert.equal(response.status,200);assert.equal((await response.json()).access.role,'player');
});

test('unrelated member and house-club IDs never receive the protected payload',async()=>{
  const user={discord_id:'300000000000000',role:'member',status:'active'};
  const denied={fetch:async()=>Response.json({allowed:false},{status:403})};
  const response=await onRequestGet({request:request(),env:env(user,denied),params:{clubId:'374656'}});
  assert.equal(response.status,403);assert.equal('analytics' in await response.json(),false);
  const house=await onRequestGet({request:request(),env:env(user),params:{clubId:'43521'}});
  assert.equal(house.status,404);assert.equal('analytics' in await house.json(),false);
});
