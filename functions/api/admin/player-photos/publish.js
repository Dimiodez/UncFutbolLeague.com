import {json} from '../../../_lib/auth.js';
import {staffGuard,resolvePhotoPlayer,photoForm,validatePhoto,MAX_PHOTO_BYTES} from '../../../_lib/player-photos.js';

// Staff publish directly from a local preview. Managers retain the pending-only endpoint.
export async function onRequestPost({request,env}){
  const guard=await staffGuard(request,env,true);if(guard.response)return guard.response;
  let form,original,portrait;
  try{
    form=await photoForm(request,2*MAX_PHOTO_BYTES+32768);
    original=await validatePhoto(form.get('photo'));
    portrait=await validatePhoto(form.get('portrait'),true);
  }catch(error){return json({error:error.message},400);}
  const player=await resolvePhotoPlayer(env,form.get('playerId'));
  if(!player)return json({error:'Unknown directory player.'},404);
  const id=crypto.randomUUID(),originalKey=`originals/${id}`,portraitKey=`portraits/${crypto.randomUUID()}.png`;
  const stored=[];
  try{
    await env.PLAYER_PHOTOS.put(originalKey,original.bytes,{httpMetadata:{contentType:original.type}});stored.push(originalKey);
    await env.PLAYER_PHOTOS.put(portraitKey,portrait.bytes,{httpMetadata:{contentType:'image/png'}});stored.push(portraitKey);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO player_photo_submissions(id,player_id,identity_id,original_key,original_type,uploaded_by,status,portrait_key,reviewed_by,reviewed_at) VALUES(?,?,?,?,?,?,'approved',?,?,CURRENT_TIMESTAMP)").bind(id,player.id,player.identity,originalKey,original.type,guard.actor.discord_id,portraitKey,guard.actor.discord_id),
      env.DB.prepare('INSERT OR IGNORE INTO player_photo_retired_assets(object_key,identity_id) SELECT portrait_key,identity_id FROM player_photo_publications WHERE identity_id=?').bind(player.identity),
      env.DB.prepare('INSERT INTO player_photo_publications(identity_id,submission_id,portrait_key,approved_by) VALUES(?,?,?,?) ON CONFLICT(identity_id) DO UPDATE SET submission_id=excluded.submission_id,portrait_key=excluded.portrait_key,approved_by=excluded.approved_by,approved_at=CURRENT_TIMESTAMP').bind(player.identity,id,portraitKey,guard.actor.discord_id)
    ]);
  }catch(error){for(const key of stored)await env.PLAYER_PHOTOS.delete(key);throw error;}
  return json({ok:true,status:'approved',identity:player.identity,portraitUrl:`/api/player-portraits/${encodeURIComponent(player.id)}?v=${id}`},201);
}
