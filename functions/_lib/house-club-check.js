export async function postHouseClubCheck(request,source){
 const origin=request.headers.get('origin');
 if(origin!==new URL(request.url).origin)return Response.json({error:'Use the checker on the house-team page.'},{status:403});
 try{
  const response=await fetch(source,{method:'POST',headers:{accept:'application/json'},signal:AbortSignal.timeout(55000)});
  return new Response(response.body,{status:response.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
 }catch{return Response.json({error:'The match checker is temporarily unavailable. Your saved stats are safe; try again shortly.'},{status:502,headers:{'cache-control':'no-store'}});}
}
