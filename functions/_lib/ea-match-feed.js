// Relay types are not EA's upstream matchType enum.
export const MATCH_TYPES=[['league','leagueMatch'],['playoff','playoffMatch'],['friendly','friendlyMatch']];
// Same public EA friendly request contract as the canonical UFB bot.
export const EA_REQUEST_HEADERS={accept:'application/json','accept-language':'en-US,en;q=0.9','sec-fetch-site':'same-origin','sec-ch-ua':'"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"','user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'};
export async function readMatchType(clubId,relayType,eaType,fetcher=fetch){
 const attempts=[];
 for(const [source,url] of [
  ['relay',`https://proclubs-api.onrender.com/api/clubs/${clubId}/matches?platform=common-gen5&type=${relayType}`],
  ['EA direct',`https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds=${clubId}&matchType=${eaType}&maxResultCount=10`]
 ]){
  try{const response=await fetcher(url,{headers:source==='EA direct'?EA_REQUEST_HEADERS:{accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(12000),cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);const matches=await response.json();if(!Array.isArray(matches))throw Error('Invalid match response');return {type:relayType,available:true,source,matches,attempts};}catch(error){attempts.push(`${source}: ${error.message}`);}
 }
 return {type:relayType,available:false,matches:[],attempts};
}
