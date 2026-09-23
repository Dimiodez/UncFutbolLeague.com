// Serve the shared website shell without Pages' static index canonicalization.
// The client router renders UFB while keeping /ufb (with or without a slash).
export async function onRequestGet({request,env}) {
  const incoming=new URL(request.url);
  if(incoming.pathname.endsWith('/')){incoming.pathname='/ufb';incoming.search='';return Response.redirect(incoming.toString(),301);}
  const url=new URL(request.url);url.pathname='/';url.search='';
  const response=await env.ASSETS.fetch(new Request(url,request));
  const headers=new Headers(response.headers);
  headers.delete('location');headers.set('cache-control','no-cache');
  return new Response(response.body,{status:200,headers});
}
