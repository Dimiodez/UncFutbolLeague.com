import {json} from '../../_lib/auth.js';
import {resolvePhotoPlayer,imageResponse} from '../../_lib/player-photos.js';
export async function onRequestGet({env,params}){
  if(!env.PLAYER_PHOTOS)return json({error:'Portrait not found.'},404);
  const player=await resolvePhotoPlayer(env,params.playerId);if(!player)return json({error:'Portrait not found.'},404);
  const row=await env.DB.prepare('SELECT portrait_key FROM player_photo_publications WHERE identity_id=?').bind(player.identity).first();if(!row)return json({error:'Portrait not found.'},404);
  const object=await env.PLAYER_PHOTOS.get(row.portrait_key);return object?imageResponse(object,'image/png',true):json({error:'Portrait not found.'},404);
}
