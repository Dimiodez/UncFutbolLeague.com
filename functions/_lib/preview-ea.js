import {getSession,json,sameOrigin} from './auth.js';
import {consumeRateLimit} from './rate-limit.js';
const PLATFORM='common-gen5';
const ROOT='https://proclubs-api.onrender.com/api';
async function relay(path){
 const response=await fetch(`${ROOT}${path}`,{headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`EA relay returned ${response.status}`);
 const data=await response.json();
 if(!Array.isArray(data))throw new Error('Invalid EA response');
 return data;
}
export async function previewEaApi(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(Number(request.headers.get('content-length')||0)>4096)return json({error:'Request too large.'},413);
 const limited=await consumeRateLimit(env,{scope:'preview-ea',subject:request.headers.get('cf-connecting-ip')||'unknown',limit:20});
 if(!limited.success)return json({error:'Please wait a minute before checking again.'},429,{'retry-after':String(limited.retryAfter)});
 try{
  if(path==='/api/ea/search'&&request.method==='GET'){
   const name=(url.searchParams.get('name')||'').trim();
   if(name.length<2||name.length>80)return json({error:'Enter a club name between 2 and 80 characters.'},400);
   const clubs=await relay(`/clubs/search?platform=${PLATFORM}&name=${encodeURIComponent(name)}`);
   return json({clubs:clubs.slice(0,25).map(club=>({id:String(club.clubId),name:club.name,platform:PLATFORM})),source:'EA Clubs via relay'});
  }
  const match=path.match(/^\/api\/ea\/clubs\/(\d{1,20})\/matches$/);
  if(match&&request.method==='GET'){
   const results=await Promise.allSettled(['leagueMatch','playoffMatch','friendlyMatch'].map(type=>relay(`/clubs/${match[1]}/matches?platform=${PLATFORM}&type=${type}`)));
   const successful=results.filter(result=>result.status==='fulfilled');
   if(!successful.length)throw new Error('All EA match feeds failed');
   const unique=new Map();successful.forEach(result=>result.value.forEach(game=>unique.set(String(game.matchId),game)));
   const matches=[...unique.values()].sort((a,b)=>Number(b.timestamp)-Number(a.timestamp));
   return json({clubId:match[1],matches,checkedAt:Date.now(),partial:successful.length!==results.length,source:'EA Clubs via relay',note:'These are club games, not accepted league fixtures. A successful check does not mean EA has published new results.'});
  }
  if(path==='/api/ea/links'){
   const actor=await getSession(request,env);
   if(!actor)return json({error:'Sign in with Discord first.'},401);
   if(request.method==='GET'){
    const rows=await env.DB.prepare('SELECT club_id AS id,club_name AS name,platform,linked_at FROM preview_ea_clubs WHERE discord_id=? ORDER BY linked_at DESC').bind(actor.discord_id).all();
    return json({clubs:rows.results});
   }
   if(request.method==='POST'){
    if(!sameOrigin(request))return json({error:'Same-origin request required.'},403);
    const payload=await request.json();
    const id=String(payload.id||''),name=String(payload.name||'').trim();
    if(!/^\d{1,20}$/.test(id)||name.length<2||name.length>80)return json({error:'Choose a valid EA club search result.'},400);
    const candidates=await relay(`/clubs/search?platform=${PLATFORM}&name=${encodeURIComponent(name)}`);
    const club=candidates.find(candidate=>String(candidate.clubId)===id);
    if(!club)return json({error:'EA could not verify that club. Search again.'},400);
    await env.DB.prepare('INSERT INTO preview_ea_clubs(discord_id,club_id,club_name,platform) VALUES(?,?,?,?) ON CONFLICT(discord_id,club_id,platform) DO UPDATE SET club_name=excluded.club_name').bind(actor.discord_id,id,club.name,PLATFORM).run();
    return json({linked:true,club:{id,name:club.name},note:'Saved to your preview account only. This does not prove EA club ownership or register a live league team.'});
   }
  }
  return json({error:'EA preview route not found.'},404);
 }catch(error){console.error('EA preview request failed',String(error));return json({error:'EA could not complete this request. No live data was changed.'},502);}
}
