import {json} from '../../_lib/auth.js';
import {staffGuard,photoForm,validatePhoto} from '../../_lib/player-photos.js';
import {canManageTeam,mediaStaff} from '../../_lib/team-media.js';
export async function onRequestGet({request,env}){
 const guard=await staffGuard(request,env,false,true);if(guard.response)return guard.response;
 const params=new URL(request.url).searchParams,division=params.get('division'),team=params.get('team');
 if(!await canManageTeam(env,guard.actor,division,team))return json({error:'Team image access required.'},403);
 const staff=mediaStaff(guard.actor);
 const managers=staff?await env.DB.prepare("SELECT g.discord_id,u.display_name FROM team_media_managers g JOIN users u ON u.discord_id=g.discord_id WHERE g.season='2' AND g.division=? AND g.team_key=?").bind(division,team).all():{results:[]};
 const users=staff?await env.DB.prepare("SELECT discord_id,display_name,username FROM users WHERE status='active' ORDER BY display_name COLLATE NOCASE").all():{results:[]};
 return json({canUpload:true,canManageManagers:staff,managers:managers.results,users:users.results});
}
export async function onRequestPost({request,env}){
 const guard=await staffGuard(request,env,true,true);if(guard.response)return guard.response;
 let form;try{form=await photoForm(request);}catch(error){return json({error:error.message},400);}
 const division=form.get('division'),team=form.get('team');
 if(!await canManageTeam(env,guard.actor,division,team))return json({error:'Team image access required.'},403);
 const actor=String(guard.actor.discord_id),action=form.get('action');
 if(action==='grant'||action==='revoke'){
  if(!mediaStaff(guard.actor))return json({error:'Only owners and administrators can appoint image managers.'},403);
  const user=String(form.get('discordId')||'');
  if(!/^\d{17,20}$/.test(user)||!await env.DB.prepare("SELECT discord_id FROM users WHERE discord_id=? AND status='active'").bind(user).first())return json({error:'Choose an active signed-in member.'},400);
  const statement=action==='grant'?env.DB.prepare("INSERT INTO team_media_managers(discord_id,season,division,team_key,assigned_by) VALUES(?,'2',?,?,?) ON CONFLICT(discord_id,season,division,team_key) DO NOTHING").bind(user,division,team,actor):env.DB.prepare("DELETE FROM team_media_managers WHERE discord_id=? AND season='2' AND division=? AND team_key=?").bind(user,division,team);
  await env.DB.batch([statement,env.DB.prepare('INSERT INTO audit_log(actor_discord_id,action,target_discord_id,details) VALUES(?,?,?,?)').bind(actor,`team_media_manager_${action}`,user,JSON.stringify({division,team}))]);
  return json({ok:true});
 }
 if(action!=='upload'||!['logo','stadium'].includes(form.get('kind')))return json({error:'Choose a logo or stadium photo.'},400);
 let photo;try{photo=await validatePhoto(form.get('photo'));}catch(error){return json({error:error.message},400);}
 const id=crypto.randomUUID(),key=`team-media/${id}`,kind=form.get('kind');
 const previous=await env.DB.prepare("SELECT a.id,a.object_key FROM team_media_publications p JOIN team_media_assets a ON a.id=p.asset_id WHERE p.season='2' AND p.division=? AND p.team_key=? AND p.kind=?").bind(division,team,kind).first();
 await env.PLAYER_PHOTOS.put(key,photo.bytes,{httpMetadata:{contentType:photo.type}});
 try{await env.DB.batch([
  env.DB.prepare('INSERT INTO team_media_assets(id,object_key,content_type,uploaded_by) VALUES(?,?,?,?)').bind(id,key,photo.type,actor),
  env.DB.prepare("INSERT INTO team_media_publications(season,division,team_key,kind,asset_id) VALUES('2',?,?,?,?) ON CONFLICT(season,division,team_key,kind) DO UPDATE SET asset_id=excluded.asset_id").bind(division,team,kind,id),
  env.DB.prepare("INSERT INTO audit_log(actor_discord_id,action,details) VALUES(?,'team_image_published',?)").bind(actor,JSON.stringify({division,team,kind,assetId:id}))
 ]);}catch(error){await env.PLAYER_PHOTOS.delete(key);throw error;}
 // Replacements do not accumulate unused photos. UUID assets are never reused.
 // Clean up only after the new image has committed; never remove a current asset.
 if(previous){try{
  const current=await env.DB.prepare('SELECT 1 AS current FROM team_media_publications WHERE asset_id=?').bind(previous.id).first();
  if(!current){await env.PLAYER_PHOTOS.delete(previous.object_key);await env.DB.prepare('DELETE FROM team_media_assets WHERE id=? AND NOT EXISTS(SELECT 1 FROM team_media_publications WHERE asset_id=?)').bind(previous.id,previous.id).run();}
 }catch{console.warn('Replaced team image cleanup deferred.');}}
 return json({ok:true,url:`/api/team-media/images/${id}`},201);
}
