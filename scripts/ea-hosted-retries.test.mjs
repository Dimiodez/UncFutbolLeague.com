import test from 'node:test';
import assert from 'node:assert/strict';
import {collectHosted} from './collect-ea-hosted.mjs';
const key='test-hosted-transport-'.repeat(4);
const feed=()=>({available:true,source:'EA direct',matches:[]});
const receipt=clubId=>Response.json({stored:true,clubId,matches:0});
const options={key,readFeed:async()=>feed(),sleep:async()=>{},random:()=>0};
test('transient plan and storage failures recover without refetching EA or changing the evidence timestamp',async()=>{
 let at=Date.parse('2026-11-26T03:00:00Z'),plans=0,posts=0,reads=0;const bodies=[],signals=[],delays=[];
 const result=await collectHosted({...options,now:()=>at,sleep:async ms=>{delays.push(ms);at+=ms;},
 readFeed:async()=>{reads++;return feed();},
 fetcher:async(url,request)=>{
  if(url.endsWith('/ea-fetch-plan'))return ++plans===1?new Response('temporary',{status:503}):Response.json({clubs:['123']});
  posts++;bodies.push(request.body);signals.push(request.signal);
  return posts<3?new Response('temporary',{status:503}):receipt('123');
 }});
 assert.equal(result.stored,1);assert.equal(reads,1);assert.equal(plans,2);assert.equal(posts,3);
 assert.deepEqual(delays,[1000,1000,3000]);assert.equal(new Set(bodies).size,1);assert.equal(new Set(signals).size,3);
 assert.equal(JSON.parse(bodies[0]).fetchedAt,'2026-11-26T03:00:01.000Z');
});
test('persistent Cloudflare failure stays failed and includes safe diagnostic identifiers',async()=>{
 let requests=0,reads=0;
 await assert.rejects(()=>collectHosted({...options,readFeed:async()=>{reads++;return feed();},fetcher:async()=>{
  requests++;return new Response('error code: 1102 '+key,{status:503,headers:{'cf-ray':'abcdef123-DFW'}});
 }}),error=>{
  assert.match(error.message,/Collection plan HTTP 503/);assert.match(error.message,/Cloudflare error 1102/);assert.match(error.message,/ray abcdef123-DFW/);
  assert.match(error.message,/after 3 attempts/);assert(!error.message.includes(key));return true;
 });
 assert.equal(requests,3);assert.equal(reads,0);
});
test('authorization and validation errors are not retried as temporary failures',async()=>{
 for(const status of [400,401,403,409]){
  let requests=0;
  await assert.rejects(()=>collectHosted({...options,sleep:async()=>{throw Error('Unexpected retry');},fetcher:async()=>{requests++;return new Response('',{status});}}),new RegExp('HTTP '+status));
  assert.equal(requests,1);
 }
});
test('a network timeout gets a new HTTP attempt and a fresh timeout signal',async()=>{
 const signals=[];let plans=0;
 const result=await collectHosted({...options,fetcher:async(url,request)=>{
  if(url.endsWith('/ea-fetch-plan')){signals.push(request.signal);if(++plans===1)throw Object.assign(Error('Temporary timeout'),{name:'TimeoutError'});return Response.json({clubs:['123']});}
  return receipt('123');
 }});
 assert.equal(result.stored,1);assert.equal(plans,2);assert.notEqual(signals[0],signals[1]);
});
test('temporary EA failure retries the real friendly request and preserves a valid empty EA response',async()=>{
 let reads=0,posts=0;
 const result=await collectHosted({...options,readFeed:async(club,type,upstream)=>{
  assert.equal(type,'friendly');assert.equal(upstream,'friendlyMatch');
  return ++reads===1?{available:false,matches:[],attempts:['EA direct: timeout']}:feed();
 },fetcher:async url=>url.endsWith('/ea-fetch-plan')?Response.json({clubs:['123']}):(posts++,receipt('123'))});
 assert.equal(result.stored,1);assert.equal(reads,2);assert.equal(posts,1);
});
test('partial failure does not resubmit successful clubs or claim missing feeds were stored',async t=>{
 const messages=[];t.mock.method(console,'log',message=>messages.push(message));
 const posts={'123':0,'456':0};
 await assert.rejects(()=>collectHosted({...options,fetcher:async(url,request)=>{
  if(url.endsWith('/ea-fetch-plan'))return Response.json({clubs:['123','456']});
  const {clubId}=JSON.parse(request.body);posts[clubId]++;
  return clubId==='123'?new Response('',{status:503}):receipt(clubId);
 }}),/1 friendly feeds failed/);
 assert.deepEqual(posts,{'123':3,'456':1});
 const summary=messages.map(s=>JSON.parse(s)).find(s=>s.clubs===2);
 assert.equal(summary.stored,1);assert.equal(summary.failures.length,1);assert.equal(summary.failures[0].clubId,'123');
});
test('a successful HTTP response without the correct storage acknowledgement is a failure',async()=>{
 for(const body of [{},{stored:false,clubId:'123',matches:0},{stored:true,clubId:'456',matches:0},{stored:true,clubId:'123',matches:9}]){
  await assert.rejects(()=>collectHosted({...options,fetcher:async url=>Response.json(url.endsWith('/ea-fetch-plan')?{clubs:['123']}:body)}),/1 friendly feeds failed/);
 }
});
test('retry-after cannot make one temporary failure sleep indefinitely',async()=>{
 const delays=[];let plans=0;
 const result=await collectHosted({...options,sleep:async ms=>delays.push(ms),fetcher:async url=>{
  if(url.endsWith('/ea-fetch-plan'))return ++plans===1?new Response('',{status:429,headers:{'retry-after':'86400'}}):Response.json({clubs:['123']});
  return receipt('123');
 }});
 assert.equal(result.stored,1);assert.deepEqual(delays,[10000]);
});
test('a relay response cannot substitute for an unavailable EA-direct friendly feed',async()=>{
 let reads=0,posts=0;
 await assert.rejects(()=>collectHosted({...options,readFeed:async()=>{reads++;return {available:true,source:'relay',matches:[]};},
 fetcher:async(url)=>{if(url.endsWith('/ea-fetch-plan'))return Response.json({clubs:['123']});posts++;return receipt('123');}}),/1 friendly feeds failed/);
 assert.equal(reads,3);assert.equal(posts,0);
});
