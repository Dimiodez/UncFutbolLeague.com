import {json} from '../../../../_lib/auth.js';
import {staffGuard,imageResponse} from '../../../../_lib/player-photos.js';
export async function onRequestGet({request,env,params}){
  const guard=await staffGuard(request,env);if(guard.response)return guard.response;
  const row=await env.DB.prepare('SELECT original_key,original_type FROM player_photo_submissions WHERE id=? AND original_deleted_at IS NULL').bind(params.photoId).first();
  if(!row)return json({error:'Photo not found.'},404);
  const image=await env.PLAYER_PHOTOS.get(row.original_key);return image?imageResponse(image,row.original_type):json({error:'Photo not found.'},404);
}
