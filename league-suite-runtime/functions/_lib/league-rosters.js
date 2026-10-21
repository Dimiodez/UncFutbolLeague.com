import {getSession,json,sameOrigin} from './auth.js';
import {consumeRateLimit} from './rate-limit.js';
export async function rosterGuard(request,env,write=false){
 const actor=await getSession(request,env);
 if(!actor||!['owner','admin'].includes(actor.role))return {response:json({error:'Administrator access required.'},403)};
 if(write&&!sameOrigin(request))return {response:json({error:'Invalid request origin.'},403)};
 if(write){const rate=await consumeRateLimit(env,{scope:'league-roster-write',subject:actor.discord_id,limit:120,windowSeconds:3600});if(!rate.success)return {response:json({error:'Roster update limit reached. Try later.'},429)};}
 return {actor};
}
export function discordName(value){
 if(typeof value!=='string')throw new Error('Enter a Discord username.');
 const name=value.trim().replace(/^@/,'');
 if(!name||name.length>80||/[\u0000-\u001f\u007f]/.test(name))throw new Error('Use a Discord name between 1 and 80 characters.');
 return {name,normalized:name.toLowerCase()};
}
export async function rosterSnapshot(env){
 const result=await env.DB.prepare(`SELECT p.id AS identity,p.discord_name,m.division,m.profile_id,m.team_key,m.metadata_json
 FROM league_players p LEFT JOIN league_roster_memberships m ON m.player_id=p.id AND m.season='2'
 WHERE NOT EXISTS(SELECT 1 FROM league_player_aliases a WHERE a.alias_id=p.id)
 ORDER BY p.discord_name COLLATE NOCASE,p.id`).all();
 const people=new Map();
 for(const row of result.results){if(!people.has(row.identity))people.set(row.identity,{id:row.identity,name:row.discord_name,memberships:{}});
  if(row.division)people.get(row.identity).memberships[row.division]={profileId:row.profile_id,team:row.team_key,metadata:JSON.parse(row.metadata_json||'{}')};}
 const players=Object.fromEntries(['6v6','10v10'].map(division=>[division,[...people.values()].map(p=>{
  const m=p.memberships[division];return {...m?.metadata,id:m?.profileId||p.id,identity:p.id,name:p.name,club:m?.team||null};
 })]));
 return {players,people:[...people.values()]};
}
