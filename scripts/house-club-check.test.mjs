import assert from 'node:assert/strict';
import test from 'node:test';
import {postHouseClubCheck} from '../functions/_lib/house-club-check.js';
test('rejects cross-site checks without calling the tracker',async()=>{
 const response=await postHouseClubCheck(new Request('https://www.uncfutbolleague.com/api/house-clubs/fc-sandy-bums',{method:'POST',headers:{origin:'https://example.com'}}),'https://example.invalid');
 assert.equal(response.status,403);
});
test('forwards same-site checks and never caches their response',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{assert.equal(options.method,'POST');assert.equal(url,'https://tracker.example/fc-mountains');return Response.json({checked:true,message:'Complete'});};
  const response=await postHouseClubCheck(new Request('https://www.uncfutbolleague.com/api/house-clubs/fc-mountains',{method:'POST',headers:{origin:'https://www.uncfutbolleague.com'}}),'https://tracker.example/fc-mountains');
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).checked,true);
 }finally{globalThis.fetch=original;}
});
