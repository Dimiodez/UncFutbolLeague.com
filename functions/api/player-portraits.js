import {json} from '../_lib/auth.js';
import {PLAYER_PHOTO_CATALOG} from '../_lib/player-photo-catalog.js';
export async function onRequestGet({env}){
  if(!env.PLAYER_PHOTOS)return json({portraits:{}});
  const rows=await env.DB.prepare('SELECT identity_id,submission_id FROM player_photo_publications').all();
  const publications=new Map(rows.results.map(row=>[row.identity_id,row.submission_id]));
  const custom=await env.DB.prepare("SELECT id FROM league_players WHERE id LIKE 'player-%'").all();
  const players=[...Object.values(PLAYER_PHOTO_CATALOG),...custom.results.map(p=>({...p,identity:p.id}))];
  return json({portraits:Object.fromEntries(players.filter(p=>publications.has(p.identity)).map(p=>[p.id,`/api/player-portraits/${encodeURIComponent(p.id)}?v=${publications.get(p.identity)}`]))});
}
