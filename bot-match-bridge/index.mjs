// Private service-binding-only bridge. No Discord writes, SQL writes or public routes.
const slugs=['ufl-season-2-6v6','ufl-season-2-10v10'];
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
const count=value=>Math.max(0,Math.trunc(number(value)));
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:null;
const text=value=>typeof value==='string'||typeof value==='number'?String(value):'';
const clubView=row=>({id:String(row.id),name:row.name,league:row.league,eaClubId:row.ea_club_id,eaClubName:row.ea_club_name||row.name,platform:row.ea_platform||'common-gen5'});
const query=`SELECT t.id,t.name,t.ea_club_id,t.ea_club_name,t.ea_platform,l.name AS league
 FROM teams t JOIN leagues l ON l.id=t.league_id
 WHERE l.guild_id=? AND l.slug IN (?,?) AND l.archived_at IS NULL AND l.is_system=0
 AND t.dissolved_at IS NULL AND t.unassigned=0 AND t.ea_club_id IS NOT NULL AND t.ea_club_id<>''`;

export function normalizeMatches(raw,type,wanted) {
  if(!Array.isArray(raw))throw new Error('Invalid EA match feed');
  return raw.slice(0,50).map(value=>{
    const match=record(value),clubs=record(match?.clubs);
    const timestamp=number(match?.timestamp??match?.playedAt),id=text(match?.matchId??match?.id);
    if(!id||timestamp<=0||!clubs||Object.keys(clubs).length!==2)throw new Error('Invalid EA match identity');
    const players=record(match.players)||{};
    const normalized=Object.entries(clubs).map(([key,value])=>{
      const club=record(value);if(!club)throw new Error('Invalid EA club');
      const clubId=text(club.clubId)||key;
      const rows=[];
      for(const [key,value] of Object.entries(players)) {
        const candidate=record(value);if(!candidate)continue;
        if('name' in candidate||'playername' in candidate||'vProName' in candidate) {
          if(text(candidate.clubId)===clubId)rows.push([key,candidate]);
        } else if(key===clubId) {
          for(const [playerId,player] of Object.entries(candidate))if(record(player))rows.push([playerId,player]);
        }
      }
      const position=value=>{const p=text(value).toLowerCase();return p.includes('goal')?'GK':p.includes('def')?'DEF':p.includes('mid')?'MID':p.includes('for')||p.includes('att')?'FWD':text(value)||'—';};
      return {id:clubId,name:text(club.clubName??club.name??record(club.details)?.name)||'Unknown club',score:count(club.score??club.goals),players:rows.map(([key,p])=>({id:text(p.playerId)||key,name:text(p.name??p.playername??p.vProName)||'Unknown player',human:true,motm:count(p.manOfTheMatch)===1,stats:[position(p.position??p.pos??p.vProPosition),number(p.rating)?number(p.rating).toFixed(1):'—',String(count(p.goals)),String(count(p.assists))]}))};
    });
    return {id,playedAt:timestamp<1e12?timestamp*1000:timestamp,type,clubs:normalized};
  }).filter(match=>match.clubs.some(club=>club.id===wanted));
}

export async function handleBridge(request,env,fetcher=fetch) {
  const url=new URL(request.url),guild=env.UFL_GUILD_ID;
  if(request.method!=='GET')return json({error:'Read-only service.'},405);
  if(url.hostname!=='ufb.internal'||request.headers.get('x-ufl-channel-id')!==guild||url.searchParams.get('channelId')!==guild)return json({error:'Invalid private service scope.'},403);
  const match=url.pathname.match(/^\/admin\/linked-clubs\/(\d{1,16})\/matches$/);
  if(url.pathname!=='/admin/linked-clubs'&&!match)return json({error:'Not found.'},404);
  try {
    const prepared=env.BOT_DB.prepare(query+(match?' AND t.id=?':' ORDER BY l.squad_size,t.name'));
    if(!match){const rows=await prepared.bind(guild,...slugs).all();return json({clubs:rows.results.map(clubView)});}
    const row=await prepared.bind(guild,...slugs,match[1]).first();
    if(!row)return json({error:'Linked club not found in the configured UFL leagues.'},404);
    // Fixed deployment setting, not a visitor-provided fetch target.
    const base=new URL(env.EA_API_BASE_URL);
    if(base.protocol!=='https:'||base.hostname!=='proclubs-api.onrender.com')throw new Error('Invalid EA relay');
    const feeds=await Promise.allSettled(['leagueMatch','playoffMatch'].map(async type=>{
      const feed=new URL(`${base.toString().replace(/\/$/,'')}/clubs/${encodeURIComponent(row.ea_club_id)}/matches`);
      feed.searchParams.set('platform',row.ea_platform||'common-gen5');feed.searchParams.set('type',type);
      const response=await fetcher(feed,{headers:{accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error(`EA feed returned ${response.status}`);
      const body=await response.text();if(body.length>1_000_000)throw new Error('EA feed too large');
      return normalizeMatches(JSON.parse(body),type,row.ea_club_id);
    }));
    const available=feeds.filter(result=>result.status==='fulfilled');
    if(!available.length)return json({error:'Recent EA matches are temporarily unavailable.'},502);
    const unique=new Map();available.flatMap(result=>result.value).forEach(match=>unique.set(match.id,match));
    return json({club:clubView(row),matches:[...unique.values()].sort((a,b)=>b.playedAt-a.playedAt).slice(0,25),partial:available.length<2});
  }catch(error){console.error('Private EA bridge failed',String(error));return json({error:'Bot data is temporarily unavailable.'},502);}
}
export default {fetch:(request,env)=>handleBridge(request,env)};
