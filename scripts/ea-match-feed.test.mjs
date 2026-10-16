import test from 'node:test';
import assert from 'node:assert/strict';
import {readMatchType} from '../functions/_lib/ea-match-feed.js';
test('friendly relay failure falls back to actual EA friendly history',async()=>{
 const urls=[];const game={matchId:'recovery',timestamp:1,clubs:{}};
 const result=await readMatchType('1236403','friendly','friendlyMatch',async url=>{urls.push(url);return urls.length===1?new Response('{}',{status:500}):Response.json([game]);});
 assert.equal(result.available,true);assert.equal(result.source,'EA direct');assert.deepEqual(result.matches,[game]);assert.match(urls[0],/type=friendly$/);assert.match(urls[1],/matchType=friendlyMatch/);
});
test('both unavailable is explicit, never an empty successful friendly feed',async()=>{
 const result=await readMatchType('1236403','friendly','friendlyMatch',async()=>new Response('{}',{status:403}));assert.equal(result.available,false);assert.equal(result.attempts.length,2);
});
