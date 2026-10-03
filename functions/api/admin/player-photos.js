import {json} from '../../_lib/auth.js';
import {staffGuard,playerFor,photoForm,validatePhoto} from '../../_lib/player-photos.js';
export async function onRequestGet({request,env}){
  const guard=await staffGuard(request,env);if(guard.response)return guard.response;
  const player=playerFor(new URL(request.url).searchParams.get('playerId'));if(!player)return json({error:'Unknown directory player.'},404);
  const rows=await env.DB.prepare('SELECT id,player_id,status,created_at,reviewed_at FROM player_photo_submissions WHERE identity_id=? ORDER BY created_at DESC,id DESC LIMIT 50').bind(player.identity).all();
  return json({photos:rows.results.map(row=>({...row,originalUrl:`/api/admin/player-photos/${row.id}/image`}))});
}
export async function onRequestPost({request,env}){
  const guard=await staffGuard(request,env,true);if(guard.response)return guard.response;
  let form,photo;try{form=await photoForm(request);photo=await validatePhoto(form.get('photo'));}catch(error){return json({error:error.message},400);}
  const player=playerFor(form.get('playerId'));if(!player)return json({error:'Unknown directory player.'},404);
  const id=crypto.randomUUID(),key=`originals/${id}`;
  await env.PLAYER_PHOTOS.put(key,photo.bytes,{httpMetadata:{contentType:photo.type}});
  try{await env.DB.prepare('INSERT INTO player_photo_submissions(id,player_id,identity_id,original_key,original_type,uploaded_by) VALUES(?,?,?,?,?,?)').bind(id,player.id,player.identity,key,photo.type,guard.actor.discord_id).run();}
  catch(error){await env.PLAYER_PHOTOS.delete(key);throw error;}
  return json({ok:true,id,status:'pending'},201);
}
