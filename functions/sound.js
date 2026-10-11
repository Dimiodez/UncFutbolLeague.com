// Keep direct links on the shared site shell without index canonicalization.
export async function onRequestGet({request,env}) {
  const incoming=new URL(request.url);
  if(incoming.pathname.endsWith('/')){incoming.pathname='/sound';incoming.search='';return Response.redirect(incoming.toString(),301);}
  const url=new URL(request.url);url.pathname='/';url.search='';
  const response=await env.ASSETS.fetch(new Request(url,request));
  const headers=new Headers(response.headers);
  headers.delete('location');headers.set('cache-control','no-cache');
  return new Response(response.body,{status:response.status,headers});
}
