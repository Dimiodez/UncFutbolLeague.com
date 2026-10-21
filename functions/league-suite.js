import {suiteAccess,suiteDenied,privateSuiteResponse} from './_lib/league-suite-access.js';
export async function onRequest(context){
 const access=await suiteAccess(context.request,context.env);if(!access.allowed)return suiteDenied(access);
 if(!['GET','HEAD'].includes(context.request.method))return new Response('Method not allowed',{status:405});
 const url=new URL(context.request.url);url.pathname='/league-suite-assets/league-workshop.html';url.search='';
 return privateSuiteResponse(await context.env.ASSETS.fetch(new Request(url,context.request)));
}
