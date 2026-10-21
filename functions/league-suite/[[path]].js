import {suiteAccess,suiteDenied,privateSuiteResponse} from '../_lib/league-suite-access.js';
const pages={'ea-clubs':'ea-clubs.html',dashboard:'league-dashboard.html',join:'league-join.html'};
export async function onRequest(context){
 const access=await suiteAccess(context.request,context.env);if(!access.allowed)return suiteDenied(access);
 const page=pages[new URL(context.request.url).pathname.split('/')[2]];if(!page||!['GET','HEAD'].includes(context.request.method))return new Response('Not found',{status:404});
 const url=new URL(context.request.url);url.pathname='/league-suite-assets/'+page;return privateSuiteResponse(await context.env.ASSETS.fetch(new Request(url,context.request)));
}
