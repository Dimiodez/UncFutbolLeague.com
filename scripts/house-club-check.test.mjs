import assert from 'node:assert/strict';
import test from 'node:test';
import {postHouseClubCheck} from '../functions/_lib/house-club-check.js';
import {onRequestGet as getBums} from '../functions/api/house-clubs/fc-sandy-bums.js';
import {onRequestGet as getMountains} from '../functions/api/house-clubs/fc-mountains.js';

test('both public club endpoints preserve upstream rate limits for partnership retries',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response('',{status:429});
  for(const [slug,handler] of [['fc-sandy-bums',getBums],['fc-mountains',getMountains]]){
   const response=await handler({request:new Request(`https://www.uncfutbolleague.com/api/house-clubs/${slug}?match=test`)});
   assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');assert.equal(response.headers.get('cache-control'),'no-store');
  }
 }finally{globalThis.fetch=original;}
});
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
