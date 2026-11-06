import {hostedFetchPlan} from './ea-hosted-feed.js';
const DISPATCH_URL='https://api.github.com/repos/Dimiodez/UncFutbolLeague.com/actions/workflows/ea-hosted-feed.yml/dispatches';
const FRESH_FOR=10*60000,RETRY_AFTER=10*60000;
// Runs on the existing Cloudflare timer; GitHub cron is only a second start path.
// Uses a repository-scoped Actions credential. It never accepts or changes scores.
export async function ensureHostedTransport(env,{now=Date.now(),fetcher=fetch}={}){
 if(env.LEAGUE_FORMAT!=='6v6')return {status:'not-coordinator'};
 const plan=await hostedFetchPlan(env.DB,now);
 if(!plan.clubs.length){const credentialCheck=await checkHostedDispatch(env,{now,fetcher});return {status:'not-needed',clubs:0,...(credentialCheck?{credentialCheck}:{})};}
 const rows=await env.DB.prepare("SELECT club_id,checked_at FROM preview_ea_feed_cache WHERE match_type='friendly'").all();
 const cached=new Map(rows.results.map(r=>[String(r.club_id),Date.parse(r.checked_at)]));
 const stale=plan.clubs.filter(id=>{const stamp=cached.get(String(id));return !Number.isFinite(stamp)||stamp>now+60000||now-stamp>=FRESH_FOR;});
 if(!stale.length)return {status:'fresh',clubs:plan.clubs.length};
 const id='ea-feed-watchdog:'+Math.floor(now/RETRY_AFTER),at=new Date(now).toISOString();
 const credential=env.EA_FEED_DISPATCH_TOKEN;
 const missing=typeof credential!=='string'||credential.length<20;
 const status=missing?'not-configured':'dispatching',details={staleClubs:stale.length,clubs:plan.clubs.length};
 const claimed=await env.DB.prepare('INSERT OR IGNORE INTO preview_collection_runs(id,league_id,checked_at,mode,status,diagnostics_json) VALUES(?,?,?,?,?,?)').bind(id,'__ea_feed_watchdog__',at,'transport',status,JSON.stringify(details)).run();
 if(!claimed.meta.changes)return {status:'cooldown',...details};
 if(missing){console.error(JSON.stringify({event:'ea_transport_watchdog',status,...details}));return {status,...details};}
 let outcome='dispatched',error;
 try{
  const response=await fetcher(DISPATCH_URL,{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+credential,accept:'application/vnd.github+json','content-type':'application/json','x-github-api-version':'2022-11-28','user-agent':'UFL-EA-transport-watchdog'},body:JSON.stringify({ref:'master',inputs:{monitor:true}}),signal:AbortSignal.timeout(15000)});
  if(response.status!==204)throw Error(await dispatchFailure(response,'GitHub dispatch'));
 }catch(e){outcome='dispatch-failed';error=String(e.message);}
 const report={status:outcome,...details,...(error?{error}:{})};
 await env.DB.prepare('UPDATE preview_collection_runs SET status=?,diagnostics_json=? WHERE id=?').bind(outcome,JSON.stringify(report),id).run();
 console[outcome==='dispatched'?'log':'error'](JSON.stringify({event:'ea_transport_watchdog',...report}));
 return report;
}

export async function checkHostedDispatch(env,{now=Date.now(),fetcher=fetch}={}){
 const credential=env.EA_FEED_DISPATCH_TOKEN;
 if(typeof credential!=='string'||credential.length<20)return null;
 // A fingerprint identifies rotations without storing or returning the token.
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(credential));
 const fingerprint=Array.from(new Uint8Array(bytes)).map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,24);
 const id='ea-feed-readiness:'+fingerprint,at=new Date(now).toISOString(),cutoff=new Date(now-RETRY_AFTER).toISOString();
 const claimed=await env.DB.prepare("INSERT INTO preview_collection_runs(id,league_id,checked_at,mode,status,diagnostics_json) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,status=excluded.status,diagnostics_json=excluded.diagnostics_json WHERE preview_collection_runs.status!='readiness-dispatched' AND preview_collection_runs.checked_at<=?").bind(id,'__ea_feed_watchdog__',at,'readiness','readiness-starting','{}',cutoff).run();
 if(!claimed.meta.changes)return {status:'already-dispatched-or-cooldown'};
 let status='readiness-dispatched',error;
 try{
  // This workflow path reads EA only: no feed ingest, scores or stats are written.
  const response=await fetcher(DISPATCH_URL,{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+credential,accept:'application/vnd.github+json','content-type':'application/json','x-github-api-version':'2022-11-28','user-agent':'UFL-EA-transport-watchdog'},body:JSON.stringify({ref:'master',inputs:{preflight:true,clubs:'["374656"]',monitor:false}}),signal:AbortSignal.timeout(15000)});
  if(response.status!==204)throw Error(await dispatchFailure(response,'GitHub readiness dispatch'));
 }catch(e){status='readiness-failed';error=String(e.message);}
 const report={status,...(error?{error}:{})};
 await env.DB.prepare('UPDATE preview_collection_runs SET status=?,diagnostics_json=? WHERE id=?').bind(status,JSON.stringify(report),id).run();
 console[error?'error':'log'](JSON.stringify({event:'ea_transport_readiness',...report}));
 return report;
}

async function dispatchFailure(response,label){
 const data=await response.json().catch(()=>({}));
 const message=typeof data.message==='string'?data.message.slice(0,180):'';
 const required=response.headers.get('x-accepted-github-permissions');
 return label+' HTTP '+response.status+(message?': '+message:'')+(required?' (required permission: '+required.slice(0,100)+')':'');
}
