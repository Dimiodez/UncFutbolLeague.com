import {pathToFileURL} from 'node:url';
import {readMatchType} from '../league-suite-runtime/functions/_lib/ea-match-feed.js';
export async function collectHosted({origin='https://ufl-preview-league-collector.andrew-dimio.workers.dev',key=process.env.EA_FEED_INGEST_KEY,fetcher=fetch,readFeed=readMatchType}={}){
 if(!key||key.length<40)throw Error('EA feed transport credential is not configured.');
 const headers={authorization:'Bearer '+key,accept:'application/json'},r=await fetcher(origin+'/ea-fetch-plan',{headers,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Collection plan HTTP '+r.status);
 const plan=await r.json();if(!Array.isArray(plan.clubs)||plan.clubs.length>30||plan.clubs.some(id=>!/^\d{1,20}$/.test(id)))throw Error('Invalid collection plan.');
 let stored=0;const failures=[];
 for(let i=0;i<plan.clubs.length;i+=3)await Promise.all(plan.clubs.slice(i,i+3).map(async clubId=>{
  try{const feed=await readFeed(clubId,'friendly','friendlyMatch');if(!feed.available||feed.source!=='EA direct')throw Error('EA direct friendly request failed: '+feed.attempts.join('; '));
   const result=await fetcher(origin+'/ea-feed',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({clubId,type:'friendly',fetchedAt:new Date().toISOString(),matches:feed.matches}),signal:AbortSignal.timeout(20000)});if(!result.ok)throw Error('Feed storage HTTP '+result.status);stored++;console.log(JSON.stringify({clubId,matches:feed.matches.length,stored:true}));
  }catch(error){failures.push({clubId,error:String(error.message)});}
 }));
 const summary={clubs:plan.clubs.length,stored,failures};console.log(JSON.stringify(summary));if(failures.length)throw Error(`${failures.length} friendly feeds failed; no successful empty response was fabricated.`);return summary;
}
export async function monitorHosted({deadline,interval=5*60000,now=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),collect=()=>collectHosted()}={}){
 if(!Number.isFinite(deadline)||!Number.isFinite(interval)||interval<1)throw Error('Invalid hosted polling window.');
 let polls=0,failedPolls=0,lastError=null;
 for(;;){polls++;try{await collect();lastError=null;}catch(error){failedPolls++;lastError=error;console.error('Hosted EA cycle failed; the next cycle will retry. '+String(error.message));}
  console.log(JSON.stringify({event:'ea_hosted_cycle',at:new Date(now()).toISOString(),polls,failedPolls}));
  if(now()>=deadline)break;await sleep(Math.min(interval,deadline-now()));
 }
 if(lastError)throw lastError;return {polls,failedPolls};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const deadline=new Date();deadline.setUTCHours(6,55,0,0);
 const run=/^(1|true)$/.test(process.env.EA_FEED_MONITOR||'')&&Date.now()<deadline.getTime()?monitorHosted({deadline:deadline.getTime()}):collectHosted();
 run.catch(e=>{console.error(String(e.message));process.exitCode=1;});
}
