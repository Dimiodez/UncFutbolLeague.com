import test from 'node:test';
import assert from 'node:assert/strict';
import {readMatchType} from '../functions/_lib/ea-match-feed.js';
test('friendly relay failure falls back to actual EA friendly history',async()=>{
 const urls=[];const game={matchId:'recovery',timestamp:1,clubs:{}};
 const result=await readMatchType('1236403','friendly','friendlyMatch',async(url,options)=>{urls.push(url);assert.match(options.headers['user-agent'],/Chrome/);assert.equal(options.headers['sec-fetch-site'],'same-origin');assert.equal(options.redirect,'manual');assert.match(url,/maxResultCount=10/);return Response.json([game]);});
 assert.equal(result.available,true);assert.equal(result.source,'EA direct');assert.deepEqual(result.matches,[game]);assert.equal(urls.length,1);assert.match(urls[0],/matchType=friendlyMatch/);
});
test('both unavailable is explicit, never an empty successful friendly feed',async()=>{
 const result=await readMatchType('1236403','friendly','friendlyMatch',async()=>new Response('{}',{status:403}));assert.equal(result.available,false);assert.equal(result.attempts.length,2);
});
