import {hostedFetchPlan} from './ea-hosted-feed.js';
const DISPATCH_URL='https://api.github.com/repos/Dimiodez/UncFutbolLeague.com/actions/workflows/ea-hosted-feed.yml/dispatches';
const FRESH_FOR=10*60000,RETRY_AFTER=10*60000;
// Runs on the existing Cloudflare timer; GitHub cron is only a second start path.
// Uses a repository-scoped Actions credential. It never accepts or changes scores.
export async function ensureHostedTransport(env,{now=Date.now(),fetcher=fetch}={}){
 if(env.LEAGUE_FORMAT!=='6v6')return {status:'not-coordinator'};
 const plan=await hostedFetchPlan(env.DB,now);
 if(!plan.clubs.length)return {status:'not-needed',clubs:0};
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
  if(response.status!==204)throw Error('GitHub dispatch HTTP '+response.status);
 }catch(e){outcome='dispatch-failed';error=String(e.message);}
 const report={status:outcome,...details,...(error?{error}:{})};
 await env.DB.prepare('UPDATE preview_collection_runs SET status=?,diagnostics_json=? WHERE id=?').bind(outcome,JSON.stringify(report),id).run();
 console[outcome==='dispatched'?'log':'error'](JSON.stringify({event:'ea_transport_watchdog',...report}));
 return report;
}
