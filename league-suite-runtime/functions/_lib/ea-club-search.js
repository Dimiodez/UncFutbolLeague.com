import {EA_REQUEST_HEADERS} from './ea-match-feed.js';
export const EA_CLUB_PLATFORM='common-gen5';
export function clubSearchName(value){
 if(typeof value!=='string'||value.trim().length<2||value.trim().length>80||/[\u0000-\u001f\u007f]/.test(value))throw Error('Enter a club name between 2 and 80 characters.');
 return value.trim();
}
export function normalizeClubSearch(rows){
 if(!Array.isArray(rows))throw Error('Invalid EA club search response.');
 const clubs=new Map();
 for(const row of rows){
  const id=String(row?.clubId??row?.id??''),name=row?.name;
  if(!/^\d{1,20}$/.test(id)||typeof name!=='string'||!name.trim()||name.length>80)throw Error('Invalid EA club search result.');
  if(clubs.has(id)&&clubs.get(id).name!==name.trim())throw Error('Conflicting EA club search results.');
  clubs.set(id,{id,name:name.trim(),platform:EA_CLUB_PLATFORM});
 }
 return [...clubs.values()];
}
export async function searchEaClubs(value,{fetcher=fetch}={}){
 const name=clubSearchName(value),query=encodeURIComponent(name),attempts=[];
 const sources=[['EA direct',`https://proclubs.ea.com/api/fc/clubs/search?platform=${EA_CLUB_PLATFORM}&clubName=${query}`],['EA relay',`https://proclubs-api.onrender.com/api/clubs/search?platform=${EA_CLUB_PLATFORM}&name=${query}`]];
 for(const [source,url] of sources){
  try{
   const response=await fetcher(url,{headers:source==='EA direct'?EA_REQUEST_HEADERS:{accept:'application/json'},redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   return {clubs:normalizeClubSearch(await response.json()).slice(0,25),source,platform:EA_CLUB_PLATFORM};
  }catch(error){attempts.push(`${source}: ${error.message}`);}
 }
 throw Error('EA club search is unavailable. Try again shortly; no team links were changed.');
}
export async function verifyEaClub(selection,options){
 const id=String(selection?.id??'');
 if(!/^\d{1,20}$/.test(id)||selection?.platform&&selection.platform!==EA_CLUB_PLATFORM)throw Error('Choose a valid current-generation EA search result.');
 const result=await searchEaClubs(selection?.name,options),club=result.clubs.find(club=>club.id===id);
 if(!club)throw Error('EA could not verify that selection. Search again and choose the matching team.');
 return {...club,verifiedAt:new Date().toISOString()};
}
