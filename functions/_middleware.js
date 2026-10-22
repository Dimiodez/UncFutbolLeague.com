// Preserve normal assets, API handlers and protected routes. Unknown page URLs
// receive the same public shell with a real 404; the client renders recovery links.
const pages=new Set(['/','/rules','/teams','/clubs','/players','/stats','/schedules','/standings','/users','/pickems','/func','/arcade','/wheel','/contact','/privacy','/account','/admin','/ufb','/utility','/fun','/league','/sound','/coaching','/totw','/tots']);
const nested=/^\/(?:clubs\/[^/]+|players\/[^/]+|coaching\/[^/]+|arcade\/(?:submit|mountain-mayhem|loosey-goosey|sandy-uppy|cleat)|teams\/house\/(?:fc-sandy-bums|fc-mountains)|schedules\/(?:community-events|league-cup|byot-tournaments|aggregate-byot)|wheel\/aggregate-byot)$/;
export async function onRequest(context){
 const path=new URL(context.request.url).pathname.replace(/\/$/,'')||'/';
 if(!['GET','HEAD'].includes(context.request.method)||pages.has(path)||nested.test(path)||path.startsWith('/api/')||path.startsWith('/league-suite')||path.startsWith('/team-hub')||/\.[^/]+$/.test(path)||/^\/(?:assets|arcade-app|func-app|goose-app|mountain-app|pickems-app|sandy-app|wheel-app)(?:\/|$)/.test(path))return context.next();
 const shell=await context.env.ASSETS.fetch(new Request(new URL('/',context.request.url),context.request));
 const headers=new Headers(shell.headers);headers.set('cache-control','no-cache');return new Response(context.request.method==='HEAD'?null:shell.body,{status:404,headers});
}
