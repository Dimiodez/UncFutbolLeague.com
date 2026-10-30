import {buildLeagueSchedule} from '../../league-engine.js';
import {collectionWindow} from '../../league-collection-window.js';
import {readMatchType} from './ea-match-feed.js';
const MAX_AGE=15*60000;
export async function hostedFetchPlan(db,now=Date.now()){
 const rows=await db.prepare('SELECT id,draft_json FROM preview_league_results WHERE enabled=1').all(),clubs=new Set();
 for(const row of rows.results){const saved=JSON.parse(row.draft_json),draft=buildLeagueSchedule(saved.settings),accepted=new Set((saved.acceptedResults||[]).map(r=>r.fixtureId));
  for(const f of draft.fixtures){const window=collectionWindow(draft,f),live=now>=window.from&&now<=window.to,missed=!accepted.has(f.id)&&f.startsAt<=now&&now-f.startsAt<=7*86400000;if(live||missed)for(const t of [f.home,f.away])if(/^\d{1,20}$/.test(t.eaClubId||''))clubs.add(t.eaClubId);}
 }return {clubs:[...clubs],generatedAt:new Date(now).toISOString(),matchType:'friendlyMatch',platform:'common-gen5'};
}
async function authenticated(request,key){
 if(typeof key!=='string'||key.length<40)return false;
 const supplied=request.headers.get('authorization')||'',expected='Bearer '+key;
 const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),[a,b]=await Promise.all([hash(supplied),hash(expected)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;
}
export async function hostedFeedApi(request,env,{now=Date.now()}={}){
 const headers={'content-type':'application/json','cache-control':'no-store'},reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(!await authenticated(request,env.EA_FEED_INGEST_KEY))return reply({error:'Unauthorized.'},401);
 const path=new URL(request.url).pathname;
 if(request.method==='GET'&&path==='/ea-fetch-plan')return reply(await hostedFetchPlan(env.DB,now));
 if(request.method!=='POST'||path!=='/ea-feed')return reply({error:'Not found.'},404);
 if(Number(request.headers.get('content-length')||0)>1000000)return reply({error:'Payload too large.'},413);
 try{
  const text=await request.text();if(text.length>1000000)return reply({error:'Payload too large.'},413);const body=JSON.parse(text),clubId=String(body.clubId||'');
  if(!/^\d{1,20}$/.test(clubId)||body.type!=='friendly'||!Array.isArray(body.matches)||body.matches.length>10)throw Error('Invalid friendly feed.');
  const fetchedAt=Date.parse(body.fetchedAt);if(!Number.isFinite(fetchedAt)||fetchedAt>now+60000||now-fetchedAt>3*60000)throw Error('Stale feed submission.');
  const plan=await hostedFetchPlan(env.DB,now);if(!plan.clubs.includes(clubId))return reply({error:'Club is outside the active collection plan.'},409);
  for(const game of body.matches){const id=String(game?.matchId??''),clubs=Object.keys(game?.clubs||{}),stamp=Number(game?.timestamp)*1000;if(!/^\d{1,30}$/.test(id)||clubs.length!==2||!clubs.includes(clubId)||!clubs.every(id=>/^\d{1,20}$/.test(id))||!Number.isFinite(stamp)||stamp<1577836800000||stamp>now+60000||!game.players||typeof game.players!=='object')throw Error('Invalid EA match identity.');}
  await env.DB.prepare("INSERT INTO preview_ea_feed_cache(club_id,match_type,body_json,checked_at) VALUES(?,'friendly',?,?) ON CONFLICT(club_id,match_type) DO UPDATE SET body_json=excluded.body_json,checked_at=excluded.checked_at WHERE excluded.checked_at>=preview_ea_feed_cache.checked_at").bind(clubId,JSON.stringify(body.matches),new Date(fetchedAt).toISOString()).run();
  return reply({stored:true,clubId,matches:body.matches.length,fetchedAt:new Date(fetchedAt).toISOString()});
 }catch(error){return reply({error:String(error.message)},400);}
}
export async function readCollectedMatchType(env,clubId,type,eaType,{now=Date.now(),readDirect=readMatchType}={}){
 const direct=await readDirect(clubId,type,eaType);if(direct.available||type!=='friendly')return direct;
 try{const cached=await env.DB.prepare("SELECT body_json,checked_at FROM preview_ea_feed_cache WHERE club_id=? AND match_type='friendly'").bind(String(clubId)).first(),stamp=Date.parse(cached?.checked_at||'');
  if(!cached||!Number.isFinite(stamp)||stamp>now+60000||now-stamp>MAX_AGE)return {...direct,attempts:[...direct.attempts,'Hosted EA feed: missing or older than 15 minutes']};
  const matches=JSON.parse(cached.body_json);if(!Array.isArray(matches))throw Error('Invalid stored feed');
  return {type,available:true,source:'EA direct via GitHub-hosted transport',matches,attempts:direct.attempts,fetchedAt:cached.checked_at};
 }catch{return {...direct,attempts:[...direct.attempts,'Hosted EA feed unavailable']};}
}
