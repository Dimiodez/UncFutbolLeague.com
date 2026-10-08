import {postHouseClubCheck} from '../../_lib/house-club-check.js';
const source='https://unc-futbol-bot.andrew-dimio.workers.dev/api/house-clubs/fc-sandy-bums';
export const onRequestPost=({request})=>postHouseClubCheck(request,source);

export async function onRequestGet({request}){
  const month=new URL(request.url).searchParams.get('month')||'all';
  const match=new URL(request.url).searchParams.get('match')||'';
  if(match&&!/^[a-zA-Z0-9_-]{1,64}$/.test(match))return Response.json({error:'Invalid match.'},{status:400});
  if(month!=='all'&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return Response.json({error:'Invalid month.'},{status:400});
  try{
    const url=new URL(source);
    url.searchParams.set('month',month);
    if(match)url.searchParams.set('match',match);
    const fresh=new URL(request.url).searchParams.get('fresh');
    if(fresh)url.searchParams.set('fresh',fresh.slice(0,20));
    const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
    if(response.status===429)return Response.json({error:'Match service is busy. Please retry in a minute.'},{status:429,headers:{'cache-control':'no-store','retry-after':'60'}});
    if(!response.ok)throw new Error(`Club archive returned ${response.status}`);
    return new Response(response.body,{headers:{'content-type':'application/json; charset=utf-8','cache-control':fresh?'no-store':'public, max-age=60'}});
  }catch(error){
    console.error('FC Sandy Bums archive unavailable',error);
    return Response.json({error:'Club history is temporarily unavailable.'},{status:502,headers:{'cache-control':'no-store'}});
  }
}
