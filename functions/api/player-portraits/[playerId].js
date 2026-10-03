import {json} from '../../_lib/auth.js';
import {playerFor,imageResponse} from '../../_lib/player-photos.js';
export async function onRequestGet({env,params}){
  const player=playerFor(params.playerId);if(!player||!env.PLAYER_PHOTOS)return json({error:'Portrait not found.'},404);
  const row=await env.DB.prepare('SELECT portrait_key FROM player_photo_publications WHERE identity_id=?').bind(player.identity).first();if(!row)return json({error:'Portrait not found.'},404);
  const object=await env.PLAYER_PHOTOS.get(row.portrait_key);return object?imageResponse(object,'image/png',true):json({error:'Portrait not found.'},404);
}
