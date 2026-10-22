import {json} from '../_lib/auth.js';
import {PLAYER_PHOTO_CATALOG} from '../_lib/player-photo-catalog.js';
export async function onRequestGet({env}){
  if(!env.PLAYER_PHOTOS)return json({portraits:{},byIdentity:{}});
  const rows=await env.DB.prepare('SELECT identity_id,submission_id FROM player_photo_publications').all();
  const publications=new Map(rows.results.map(row=>[row.identity_id,row.submission_id]));
  const memberships=await env.DB.prepare('SELECT p.id,m.profile_id FROM league_players p LEFT JOIN league_roster_memberships m ON m.player_id=p.id').all();
  const players=new Map(Object.values(PLAYER_PHOTO_CATALOG).map(p=>[p.id,{...p}]));
  for(const row of memberships.results){
    players.set(row.id,{id:row.id,identity:row.id});
    if(row.profile_id)players.set(row.profile_id,{id:row.profile_id,identity:row.id});
  }
  const aliases=await env.DB.prepare('SELECT alias_id,canonical_id FROM league_player_aliases').all(),identities=new Map(aliases.results.map(a=>[a.alias_id,a.canonical_id]));
  players.forEach(p=>{p.identity=identities.get(p.identity)||p.identity;});
  return json({
    portraits:Object.fromEntries([...players.values()].filter(p=>publications.has(p.identity)).map(p=>[p.id,`/api/player-portraits/${encodeURIComponent(p.id)}?v=${publications.get(p.identity)}`])),
    byIdentity:Object.fromEntries([...publications].map(([identity,submission])=>[identity,`/api/player-portraits/${encodeURIComponent(identity)}?v=${submission}`]))
  });
}
