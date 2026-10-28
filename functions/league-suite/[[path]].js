import {suiteAccess,suiteAccessPage,privateSuiteResponse} from '../_lib/league-suite-access.js';
const pages={'':'league-workshop.html',view:'league-centre.html','ea-clubs':'ea-clubs.html',dashboard:'league-dashboard.html',join:'league-join.html'};
export async function onRequest(context){
 const access=await suiteAccess(context.request,context.env);if(!access.allowed)return suiteAccessPage(access,context.request,context.env);
 const route=new URL(context.request.url).pathname.replace(/^\/league-suite\/?/,'').replace(/\/$/,'');
 const page=Object.hasOwn(pages,route)?pages[route]:null;if(!page||!['GET','HEAD'].includes(context.request.method))return new Response('Not found',{status:404});
 const url=new URL(context.request.url);url.pathname='/league-suite-assets/'+page.replace(/\.html$/,'');return privateSuiteResponse(await context.env.ASSETS.fetch(new Request(url,context.request)));
}

