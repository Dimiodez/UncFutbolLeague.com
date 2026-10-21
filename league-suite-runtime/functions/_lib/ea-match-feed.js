// Relay types are not EA's upstream matchType enum.
export const MATCH_TYPES=[['league','leagueMatch'],['playoff','playoffMatch'],['friendly','friendlyMatch']];
export async function readMatchType(clubId,relayType,eaType,fetcher=fetch){
 const attempts=[];
 for(const [source,url] of [
  ['relay',`https://proclubs-api.onrender.com/api/clubs/${clubId}/matches?platform=common-gen5&type=${relayType}`],
  ['EA direct',`https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds=${clubId}&matchType=${eaType}&maxResultCount=20`]
 ]){
  try{const response=await fetcher(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000),cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);const matches=await response.json();if(!Array.isArray(matches))throw Error('Invalid match response');return {type:relayType,available:true,source,matches,attempts};}catch(error){attempts.push(`${source}: ${error.message}`);}
 }
 return {type:relayType,available:false,matches:[],attempts};
}
