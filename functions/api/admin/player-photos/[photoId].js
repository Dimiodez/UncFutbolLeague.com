import {json} from '../../../_lib/auth.js';
import {staffGuard,photoForm,validatePhoto} from '../../../_lib/player-photos.js';
export async function onRequestPost({request,env,params}){
  const guard=await staffGuard(request,env,true);if(guard.response)return guard.response;
  const row=await env.DB.prepare('SELECT id,identity_id,status FROM player_photo_submissions WHERE id=?').bind(params.photoId).first();if(!row)return json({error:'Photo not found.'},404);
  let form;try{form=await photoForm(request);}catch(error){return json({error:error.message},400);}
  const action=form.get('action');
  if(action==='reject'){
    if(row.status==='approved')return json({error:'This photo is already approved. Approve a replacement instead.'},409);
    await env.DB.prepare("UPDATE player_photo_submissions SET status='rejected',reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=? AND status<>'approved'").bind(guard.actor.discord_id,row.id).run();return json({ok:true});
  }
  if(action!=='approve')return json({error:'Unknown review action.'},400);
  let photo;try{photo=await validatePhoto(form.get('portrait'),true);}catch(error){return json({error:error.message},400);}
  // Each approval is immutable in storage; previous public image remains until DB commit.
  const key=`portraits/${crypto.randomUUID()}.png`;
  await env.PLAYER_PHOTOS.put(key,photo.bytes,{httpMetadata:{contentType:'image/png'}});
  try{await env.DB.batch([
    env.DB.prepare("UPDATE player_photo_submissions SET status='approved',portrait_key=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?").bind(key,guard.actor.discord_id,row.id),
    env.DB.prepare('INSERT INTO player_photo_publications(identity_id,submission_id,portrait_key,approved_by) VALUES(?,?,?,?) ON CONFLICT(identity_id) DO UPDATE SET submission_id=excluded.submission_id,portrait_key=excluded.portrait_key,approved_by=excluded.approved_by,approved_at=CURRENT_TIMESTAMP').bind(row.identity_id,row.id,key,guard.actor.discord_id)
  ]);}catch(error){await env.PLAYER_PHOTOS.delete(key);throw error;}
  return json({ok:true,status:'approved'});
}
