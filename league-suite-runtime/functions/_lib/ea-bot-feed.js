import {ensureHostedTransport} from './ea-transport-watchdog.js';
const MAX_AGE=15*60000;
export async function requestHostedFriendly(env,{clubId,platform='common-gen5'}={}, {now=Date.now(),schedule=()=>{}}={}){
 clubId=String(clubId||'');
 if(!/^\d{1,20}$/.test(clubId)||platform!=='common-gen5')throw Error('Unsupported hosted EA club or platform.');
 if(env.LEAGUE_FORMAT!=='6v6')throw Error('EA feed requests require the coordinator.');
 await env.DB.prepare('INSERT INTO preview_ea_feed_requests(club_id,requested_until) VALUES(?,?) ON CONFLICT(club_id) DO UPDATE SET requested_until=MAX(preview_ea_feed_requests.requested_until,excluded.requested_until)').bind(clubId,new Date(now+30*60000).toISOString()).run();
 const cached=await env.DB.prepare("SELECT body_json,checked_at FROM preview_ea_feed_cache WHERE club_id=? AND match_type='friendly'").bind(clubId).first();
 const stamp=Date.parse(cached?.checked_at||'');
 if(cached&&Number.isFinite(stamp)&&stamp<=now+60000&&now-stamp<=MAX_AGE){
  const matches=JSON.parse(cached.body_json);
  if(Array.isArray(matches)&&matches.length<=10&&matches.every(g=>Object.keys(g?.clubs||{}).includes(clubId)))return {available:true,source:'EA direct via GitHub-hosted transport',matches,fetchedAt:cached.checked_at};
 }
 schedule(ensureHostedTransport(env,{now}).catch(error=>console.error(JSON.stringify({event:'bot_ea_refresh_failed',error:String(error.message)}))));
 return {available:false,status:'refreshing',matches:[],retryAfterSeconds:30};
}
