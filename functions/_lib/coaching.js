import {getSession, json, sameOrigin} from './auth.js';
import {consumeRateLimit} from './rate-limit.js';
import {boundedBytes, validatePhoto, imageResponse} from './player-photos.js';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const MAX_BODY=5*1024*1024+131072;
const staff=user=>['owner','admin'].includes(user?.role);
const visible=(post,user)=>post && post.status!=='deleted' && (post.status==='published'||post.author_id===user?.discord_id||staff(user));
const baseSelect=`SELECT p.*, u.display_name AS author_name,
 (SELECT COUNT(*) FROM coaching_hearts h WHERE h.post_id=p.id) AS hearts,
 EXISTS(SELECT 1 FROM coaching_hearts h WHERE h.post_id=p.id AND h.user_id=?) AS hearted
 FROM coaching_posts p JOIN users u ON u.discord_id=p.author_id`;
function serialize(post,user,full=false){
  const result={id:post.id,title:post.title,hook:post.hook,author:post.author_name,
    coverUrl:`/api/coaching/${post.id}/cover?v=${post.revision}`,status:post.status,
    revision:post.revision,createdAt:post.created_at,updatedAt:post.updated_at,
    hearts:Number(post.hearts),hearted:Boolean(post.hearted),canEdit:post.author_id===user?.discord_id,canModerate:staff(user)};
  if(full)result.body=post.body;
  return result;
}
export function validateGuide(data){
  const result={};
  for(const [field,max] of [['title',120],['hook',220],['body',30000]]){
    const value=typeof data[field]==='string'?data[field].trim():'';
    if(!value||value.length>max)throw new Error(`${field==='body'?'Guide':field[0].toUpperCase()+field.slice(1)} needs 1–${max.toLocaleString('en-US')} characters.`);
    result[field]=value;
  }
  return result;
}
async function rateGuard(env,user,scope,limit,windowSeconds){
  const result=await consumeRateLimit(env,{scope,subject:user.discord_id,limit,windowSeconds});
  return result.success?null:json({error:'Too many changes. Please try again later.'},429,{'retry-after':String(result.retryAfter)});
}
async function form(request){
  if(!request.headers.get('content-type')?.startsWith('multipart/form-data'))throw new Error('Use the guide form to submit your post.');
  const bytes=await boundedBytes(request,MAX_BODY);
  return new Response(bytes,{headers:{'content-type':request.headers.get('content-type')}}).formData();
}
export async function coachingApi(request,env,id=null,operation=null){
  try{
    if(id&&!UUID.test(id))return json({error:'Guide not found.'},404);
    if(!env.DB)return json({error:'Coaching is temporarily unavailable.'},503);
    const user=await getSession(request,env);
    if(request.method==='GET'){
      if(id){
        const post=await env.DB.prepare(`${baseSelect} WHERE p.id=?`).bind(user?.discord_id||'',id).first();
        if(!visible(post,user))return json({error:'Guide not found.'},404);
        if(operation==='cover'){
          const object=await env.PLAYER_PHOTOS?.get(post.cover_key);
          return object?imageResponse(object,post.cover_type):json({error:'Image not found.'},404);
        }
        if(operation)return json({error:'Not found.'},404);
        return json({post:serialize(post,user,true)});
      }
      const params=new URL(request.url).searchParams,view=params.get('view')||'all';
      if(!['all','mine','moderation'].includes(view))return json({error:'Unknown view.'},400);
      if(view!=='all'&&!user)return json({error:'Sign in with Discord first.'},401);
      if(view==='moderation'&&!staff(user))return json({error:'Administrator access required.'},403);
      const page=Number(params.get('page')||1);
      if(!Number.isSafeInteger(page)||page<1||page>10000)return json({error:'Invalid page.'},400);
      const where=view==='mine'?"p.status!='deleted' AND p.author_id=?":view==='moderation'?"p.status='hidden'":"p.status='published'";
      const binds=[user?.discord_id||''];if(view==='mine')binds.push(user.discord_id);
      binds.push((page-1)*12);
      const rows=await env.DB.prepare(`${baseSelect} WHERE ${where} ORDER BY p.created_at DESC,p.id DESC LIMIT 13 OFFSET ?`).bind(...binds).all();
      return json({posts:rows.results.slice(0,12).map(p=>serialize(p,user)),hasMore:rows.results.length>12,page});
    }
    if(request.method!=='POST')return json({error:'Method not allowed.'},405,{'allow':'GET, POST'});
    if(!sameOrigin(request))return json({error:'Invalid request origin.'},403);
    if(!user)return json({error:'Sign in with Discord first.'},401);
    let current;
    if(id){
      current=await env.DB.prepare('SELECT * FROM coaching_posts WHERE id=?').bind(id).first();
      if(!visible(current,user))return json({error:'Guide not found.'},404);
    }
    if(operation==='heart'){
      if(current.status!=='published')return json({error:'Only published guides can be hearted.'},400);
      const denied=await rateGuard(env,user,'coaching-heart',120,60);if(denied)return denied;
      let data;try{const bytes=await boundedBytes(request,1024);data=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'Invalid heart request.'},400);}
      if(typeof data.hearted!=='boolean')return json({error:'Choose a heart state.'},400);
      if(data.hearted)await env.DB.prepare("INSERT OR IGNORE INTO coaching_hearts(post_id,user_id) SELECT id,? FROM coaching_posts WHERE id=? AND status='published'").bind(user.discord_id,id).run();
      else await env.DB.prepare('DELETE FROM coaching_hearts WHERE post_id=? AND user_id=?').bind(id,user.discord_id).run();
      const post=await env.DB.prepare(`${baseSelect} WHERE p.id=?`).bind(user.discord_id,id).first();
      return json({hearts:Number(post.hearts),hearted:Boolean(post.hearted)});
    }
    if(operation)return json({error:'Not found.'},404);
    if(current&&current.author_id!==user.discord_id&&!staff(user))return json({error:'You can only change your own guides.'},403);
    const denied=await rateGuard(env,user,id?'coaching-edit':'coaching-create',id?60:10,3600);if(denied)return denied;
    let data;
    try{data=await form(request);}catch(error){return json({error:error.message},error.message.includes('limit')?413:400);}
    const action=data.get('action')||'save';
    const revision=Number(data.get('revision'));
    if(current&&(!data.has('revision')||!Number.isSafeInteger(revision)||revision<0))return json({error:'Reload this guide before saving.'},400);
    if(['hide','restore','delete'].includes(action)){
      if(!current)return json({error:'Guide not found.'},404);
      if(action!=='delete'&&!staff(user))return json({error:'Administrator access required.'},403);
      const status={hide:'hidden',restore:'published',delete:'deleted'}[action];
      const results=await env.DB.batch([
        env.DB.prepare('INSERT INTO coaching_moderation(post_id,actor_id,action) SELECT id,?,? FROM coaching_posts WHERE id=? AND revision=?').bind(user.discord_id,action,id,revision),
        env.DB.prepare("UPDATE coaching_posts SET status=?,revision=revision+1,updated_at=datetime('now') WHERE id=? AND revision=?").bind(status,id,revision)
      ]);
      if(results[1].meta.changes!==1)return json({error:'This guide changed. Reload before saving.'},409);
      return json({ok:true,status});
    }
    if(action!=='save')return json({error:'Unknown action.'},400);
    if(current&&current.author_id!==user.discord_id)return json({error:'Only the author can edit this guide. Use moderation to hide it.'},403);
    let guide,cover;
    try{
      guide=validateGuide(Object.fromEntries(data));
      const file=data.get('cover');
      if(file&&typeof file!=='string'&&file.size)cover=await validatePhoto(file);
      if(!current&&!cover)throw new Error('Add a cover image before publishing.');
    }catch(error){return json({error:error.message},400);}
    if(cover&&!env.PLAYER_PHOTOS)return json({error:'Image storage is temporarily unavailable.'},503);
    const postId=id||crypto.randomUUID(),key=cover?`coaching/${postId}/${crypto.randomUUID()}`:current.cover_key;
    if(cover)await env.PLAYER_PHOTOS.put(key,cover.bytes,{httpMetadata:{contentType:cover.type}});
    let result;
    try{
      result=current?await env.DB.prepare("UPDATE coaching_posts SET title=?,hook=?,body=?,cover_key=?,cover_type=?,revision=revision+1,updated_at=datetime('now') WHERE id=? AND revision=? AND status!='deleted'").bind(guide.title,guide.hook,guide.body,key,cover?.type||current.cover_type,id,revision).run():
        await env.DB.prepare("INSERT INTO coaching_posts(id,author_id,title,hook,body,cover_key,cover_type) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM coaching_posts WHERE author_id=? AND status!='deleted')<100").bind(postId,user.discord_id,guide.title,guide.hook,guide.body,key,cover.type,user.discord_id).run();
    }catch(error){if(cover)await env.PLAYER_PHOTOS.delete(key);throw error;}
    if(result.meta.changes!==1){if(cover)await env.PLAYER_PHOTOS.delete(key);return json({error:current?'This guide changed. Reload before saving.':'You have reached the 100-guide limit.'},409);}
    // Successful replacements no longer reference the old immutable upload key.
    if(cover&&current&&current.cover_key!==key){try{await env.PLAYER_PHOTOS.delete(current.cover_key);}catch{console.error('Coaching old cover cleanup deferred');}}
    const post=await env.DB.prepare(`${baseSelect} WHERE p.id=?`).bind(user.discord_id,postId).first();
    return json({post:serialize(post,user,true)},current?200:201);
  }catch(error){console.error('Coaching unavailable',error.name);return json({error:'Coaching is temporarily unavailable. Please try again.'},503);}
}
