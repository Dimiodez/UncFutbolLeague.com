import {getSession,json,sameOrigin} from './auth.js';
export async function suiteAccess(request,env){
 const user=await getSession(request,env);
 if(!user||!['owner','admin'].includes(user.role))return {user,allowed:false,adminsEnabled:false};
 let row;try{row=await env.DB.prepare('SELECT admins_enabled FROM league_suite_access WHERE id=1').first();}catch{return {user,allowed:user.role==='owner',adminsEnabled:false};}
 const adminsEnabled=row?.admins_enabled===1;return {user,allowed:user.role==='owner'||user.role==='admin'&&adminsEnabled,adminsEnabled};
}
export async function suiteAccessApi(request,env){
 const access=await suiteAccess(request,env);
 if(request.method==='GET')return json({allowed:access.allowed,owner:access.user?.role==='owner',adminsEnabled:access.allowed?access.adminsEnabled:false});
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 if(!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 if(access.user?.role!=='owner')return json({error:'Only the owner can change League Suite access.'},403);
 let input;try{const raw=await request.text();if(raw.length>256)throw Error();input=JSON.parse(raw);}catch{return json({error:'Invalid access settings.'},400);}
 if(typeof input.adminsEnabled!=='boolean')return json({error:'Choose whether administrators may test.'},400);
 await env.DB.prepare('UPDATE league_suite_access SET admins_enabled=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').bind(input.adminsEnabled?1:0,access.user.discord_id).run();
 return json({saved:true,allowed:true,owner:true,adminsEnabled:input.adminsEnabled});
}
export function suiteDenied(access){return new Response(access.user?'League Suite is restricted to the owner. Administrator testing has not been enabled.':'Sign in on the official site to access League Suite.',{status:access.user?403:401,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});}
export function privateSuiteResponse(response){const headers=new Headers(response.headers);headers.set('cache-control','private, no-store');headers.set('x-robots-tag','noindex, nofollow');headers.set('vary','Cookie');return new Response(response.body,{status:response.status,headers});}
