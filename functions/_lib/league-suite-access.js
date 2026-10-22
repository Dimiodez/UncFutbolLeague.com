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
// Read only the public shell; never fetch a protected page to render an access error.
export async function suiteAccessPage(access,request,env){
 const url=new URL(request.url),destination=url.pathname+url.search;
 let header='<header class="site-header"><a class="brand" href="/">UNC FUTBOL LEAGUE</a><a href="/ufb">UFB documentation</a><a href="/league">League</a></header>';
 try{const shell=await (await env.ASSETS.fetch(new Request(new URL('/',url)))).text();header=shell.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0]||header;}catch{}
 const signedIn=Boolean(access.user),title=signedIn?'League Suite access is restricted':'Sign in to League Suite';
 if(signedIn)header=header.replace('id="account-nav">Sign in','id="account-nav">Account');
 const copy=signedIn?'Your account does not currently have League Suite access. The owner controls administrator testing. Your account and public league pages are still available.':'Sign in with Discord on the official site. You will return here after sign-in; League Suite remains restricted to authorized league staff.';
 const signin='/account?returnTo='+encodeURIComponent(destination);
 return privateSuiteResponse(new Response(`<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · UFL</title><link rel="stylesheet" href="/styles.css"><script src="/theme-init.js"></script><script src="/navigation-ux.js" defer></script></head><body data-standalone-navigation="true"><a class="skip-link" href="#main">Skip to content</a>${header}<main id="main" tabindex="-1"><section class="section"><span class="section-kicker">Private league workspace</span><h1>${title}</h1><p>${copy}</p><div class="button-row"><a class="button" href="${signedIn?'/account':signin}">${signedIn?'Go to Account':'Sign in with Discord'}</a><a class="button secondary" href="/">Back to Home</a><a href="/league">Browse the league</a></div></section></main></body></html>`,{status:signedIn?403:401,headers:{'content-type':'text/html; charset=utf-8'}}));
}
export function privateSuiteResponse(response){const headers=new Headers(response.headers);headers.set('cache-control','private, no-store');headers.set('x-robots-tag','noindex, nofollow');headers.set('vary','Cookie');return new Response(response.body,{status:response.status,headers});}
