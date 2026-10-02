const source='https://unc-futbol-bot.andrew-dimio.workers.dev/api/house-clubs/fc-mountains';

export async function onRequestGet({request}){
  const month=new URL(request.url).searchParams.get('month')||'all';
  if(month!=='all'&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return Response.json({error:'Invalid month.'},{status:400});
  try{
    const url=new URL(source);
    url.searchParams.set('month',month);
    const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error(`Club archive returned ${response.status}`);
    return new Response(response.body,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=60'}});
  }catch(error){
    console.error('FC Mountains archive unavailable',error);
    return Response.json({error:'Club history is temporarily unavailable.'},{status:502,headers:{'cache-control':'no-store'}});
  }
}
