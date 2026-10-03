import {json} from '../../_lib/auth.js';
import {staffGuard,resolvePhotoPlayer,photoForm,validatePhoto} from '../../_lib/player-photos.js';
export async function onRequestGet({request,env}){
  const guard=await staffGuard(request,env);if(guard.response)return guard.response;
  const player=await resolvePhotoPlayer(env,new URL(request.url).searchParams.get('playerId'));if(!player)return json({error:'Unknown directory player.'},404);
  const rows=await env.DB.prepare('SELECT id,player_id,status,created_at,reviewed_at,original_deleted_at FROM player_photo_submissions WHERE identity_id=? ORDER BY created_at DESC,id DESC LIMIT 50').bind(player.identity).all();
  return json({photos:rows.results.map(row=>({...row,originalUrl:row.original_deleted_at?null:`/api/admin/player-photos/${row.id}/image`}))});
}
export async function onRequestPost({request,env}){
  const guard=await staffGuard(request,env,true);if(guard.response)return guard.response;
  let form,photo;try{form=await photoForm(request);}catch(error){return json({error:error.message},400);}
  const player=await resolvePhotoPlayer(env,form.get('playerId'));if(!player)return json({error:'Unknown directory player.'},404);
  if(form.get('action')==='cleanup'){
    // Only reviewed originals for this exact player identity are eligible. Pending uploads stay private.
    const originals=await env.DB.prepare("SELECT id,original_key FROM player_photo_submissions WHERE identity_id=? AND status IN ('approved','rejected') AND original_deleted_at IS NULL").bind(player.identity).all();
    const retired=await env.DB.prepare('SELECT object_key FROM player_photo_retired_assets WHERE identity_id=? AND object_key NOT IN (SELECT portrait_key FROM player_photo_publications)').bind(player.identity).all();
    let removed=0;
    for(const row of originals.results){
      await env.PLAYER_PHOTOS.delete(row.original_key);
      await env.DB.prepare('UPDATE player_photo_submissions SET original_deleted_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.id).run();removed++;
    }
    for(const row of retired.results){
      // Approval always generates a new UUID; a retired key cannot become current again.
      await env.PLAYER_PHOTOS.delete(row.object_key);
      await env.DB.prepare('DELETE FROM player_photo_retired_assets WHERE object_key=?').bind(row.object_key).run();removed++;
    }
    return json({ok:true,removed});
  }
  try{photo=await validatePhoto(form.get('photo'));}catch(error){return json({error:error.message},400);}
  const id=crypto.randomUUID(),key=`originals/${id}`;
  await env.PLAYER_PHOTOS.put(key,photo.bytes,{httpMetadata:{contentType:photo.type}});
  try{await env.DB.prepare('INSERT INTO player_photo_submissions(id,player_id,identity_id,original_key,original_type,uploaded_by) VALUES(?,?,?,?,?,?)').bind(id,player.id,player.identity,key,photo.type,guard.actor.discord_id).run();}
  catch(error){await env.PLAYER_PHOTOS.delete(key);throw error;}
  return json({ok:true,id,status:'pending'},201);
}
