import {pathToFileURL} from 'node:url';
import {readMatchType} from '../league-suite-runtime/functions/_lib/ea-match-feed.js';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const RETRYABLE_HTTP=new Set([408,429,500,502,503,504,520,521,522,523,524]);
const retryDelay=(attempt,random)=>[1000,3000][attempt-1]+Math.floor(random()*500);
async function responseFailure(response,label,attempt){
 const ray=response.headers.get('cf-ray')||'';
 // Only extract Cloudflare's numeric error identifier; never log response bodies or authorization.
 const body=await response.text().catch(()=>'');
 const code=body.match(/(?:error code:|error\s+)\s*(1\d{3})\b/i)?.[1];
 const details=[code?'Cloudflare error '+code:null,/^[a-z0-9-]{1,80}$/i.test(ray)?'ray '+ray:null].filter(Boolean);
 return Error(label+' HTTP '+response.status+(details.length?' ('+details.join('; ')+')':'')+(attempt>1?' after '+attempt+' attempts':''));
}
async function hostedRequest(url,options,{fetcher,sleep,random,label,clubId}){
 for(let attempt=1;attempt<=3;attempt++){
  let response;
  try{response=await fetcher(url,{...options,signal:AbortSignal.timeout(20000)});}
  catch(error){
   if(attempt===3||!['TypeError','AbortError','TimeoutError'].includes(error.name))throw error;
   const delay=retryDelay(attempt,random);
   console.warn(JSON.stringify({event:'ea_hosted_retry',stage:label,...(clubId?{clubId}:{}),attempt,nextAttempt:attempt+1,reason:'network-or-timeout',delay}));
   await sleep(delay);continue;
  }
  if(response.ok)return response;
  const status=response.status;
  const retryAfter=response.headers.get('retry-after');
  const error=await responseFailure(response,label,attempt);
  if(attempt===3||!RETRYABLE_HTTP.has(status))throw error;
  const suggested=retryAfter&&/^\d+(?:\.\d+)?$/.test(retryAfter)?Math.min(Number(retryAfter)*1000,10000):0;
  const delay=Math.max(retryDelay(attempt,random),suggested);
  console.warn(JSON.stringify({event:'ea_hosted_retry',stage:label,...(clubId?{clubId}:{}),attempt,nextAttempt:attempt+1,status,delay}));
  await sleep(delay);
 }
}
async function directFriendly(clubId,{readFeed,sleep,random}){
 let error;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const feed=await readFeed(clubId,'friendly','friendlyMatch');
   if(feed.available&&feed.source==='EA direct'&&Array.isArray(feed.matches))return feed;
   error=Error('EA direct friendly request failed: '+(feed.attempts||[]).join('; '));
  }catch(cause){error=cause;}
  if(attempt<3){
   const delay=retryDelay(attempt,random);
   console.warn(JSON.stringify({event:'ea_hosted_retry',stage:'EA direct',clubId,attempt,nextAttempt:attempt+1,delay}));
   await sleep(delay);
  }
 }
 throw error;
}
export async function collectHosted({origin='https://ufl-preview-league-collector.andrew-dimio.workers.dev',key=process.env.EA_FEED_INGEST_KEY,fetcher=fetch,readFeed=readMatchType,sleep=pause,random=Math.random,now=Date.now}={}){
 if(!key||key.length<40)throw Error('EA feed transport credential is not configured.');
 const headers={authorization:'Bearer '+key,accept:'application/json'};
 const r=await hostedRequest(origin+'/ea-fetch-plan',{headers},{fetcher,sleep,random,label:'Collection plan'});
 const plan=await r.json();
 if(!Array.isArray(plan.clubs)||plan.clubs.length>100||plan.clubs.some(id=>!/^\d{1,20}$/.test(id))||new Set(plan.clubs).size!==plan.clubs.length)throw Error('Invalid collection plan.');
 let stored=0;const failures=[];
 for(let i=0;i<plan.clubs.length;i+=3)await Promise.all(plan.clubs.slice(i,i+3).map(async clubId=>{
  try{
   const feed=await directFriendly(clubId,{readFeed,sleep,random});
   // The original fetch time stays fixed across storage retries. A retry must not freshen stale evidence.
   const body=JSON.stringify({clubId,type:'friendly',fetchedAt:new Date(now()).toISOString(),matches:feed.matches});
   const result=await hostedRequest(origin+'/ea-feed',{method:'POST',headers:{...headers,'content-type':'application/json'},body},{fetcher,sleep,random,label:'Feed storage',clubId});
   const receipt=await result.json();
   if(receipt.stored!==true||String(receipt.clubId)!==String(clubId)||receipt.matches!==feed.matches.length)throw Error('Feed storage acknowledgement did not match the submitted club and matches.');
   stored++;console.log(JSON.stringify({clubId,matches:feed.matches.length,stored:true}));
  }catch(error){failures.push({clubId,error:String(error.message).replaceAll(key,'[redacted]')});}
 }));
 const summary={clubs:plan.clubs.length,stored,failures};console.log(JSON.stringify(summary));
 if(failures.length)throw Error(`${failures.length} friendly feeds failed after bounded retries; no successful empty response was fabricated.`);
 return summary;
}
export async function monitorHosted({deadline,interval=5*60000,now=Date.now,sleep=pause,collect=()=>collectHosted()}={}){
 if(!Number.isFinite(deadline)||!Number.isFinite(interval)||interval<1)throw Error('Invalid hosted polling window.');
 let polls=0,failedPolls=0,lastError=null;
 for(;;){polls++;try{await collect();lastError=null;}catch(error){failedPolls++;lastError=error;console.error('Hosted EA cycle failed; the next cycle will retry. '+String(error.message));}
  console.log(JSON.stringify({event:'ea_hosted_cycle',at:new Date(now()).toISOString(),polls,failedPolls}));
  if(now()>=deadline)break;await sleep(Math.min(interval,deadline-now()));
 }
 if(lastError)throw lastError;return {polls,failedPolls};
}
export function hostedMonitorDeadline(now=Date.now()){
 const matchnightEnd=new Date(now);matchnightEnd.setUTCHours(6,55,0,0);
 // Stay below the 350-minute job limit even when a retry starts early.
 return Math.min(matchnightEnd.getTime(),now+330*60000);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const deadline=hostedMonitorDeadline();
 const run=/^(1|true)$/.test(process.env.EA_FEED_MONITOR||'')&&Date.now()<deadline?monitorHosted({deadline}):collectHosted();
 run.catch(e=>{console.error(String(e.message));process.exitCode=1;});
}
