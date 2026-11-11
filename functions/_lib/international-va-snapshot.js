// Read the public snapshot produced by the existing GitHub VA sync/deployment.
export async function internationalVaSnapshot(env){
 if(!env.ASSETS)return null;
 const response=await env.ASSETS.fetch(new URL('https://www.uncfutbolleague.com/pickems-app/seasons/s1-internationals.json'));
 if(response.status===404)return null; // Before the first successful VA import.
 if(!response.ok)throw Error('International results are temporarily unavailable.');
 if(!(response.headers.get('content-type')||'').includes('application/json'))return null;
 const value=await response.json();
 if(value.schemaVersion!==1||value.key!=='s1-internationals'||value.competitionId!==4||value.seasonId!==6||
 !Array.isArray(value.fixtures)||value.fixtures.length<52||!Array.isArray(value.standings)||value.standings.length!==10||!Array.isArray(value.players))
 throw Error('International source mappings need review.');
 return value;
}
