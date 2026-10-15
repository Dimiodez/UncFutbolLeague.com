import { ROSTER_CLUBS } from './roster-clubs.js';
export function memberTitleTeams(){
 return [...Object.entries(ROSTER_CLUBS).flatMap(([division,teams])=>teams.map(t=>({id:division+':'+t.key,name:t.name,division}))),
 {id:'house:fc-sandy-bums',name:'FC Sandy Bums',division:'house'},{id:'house:fc-mountains',name:'FC Mountains',division:'house'}];
}
export async function ensureMemberTitles(env) {
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS member_titles (
 discord_id TEXT PRIMARY KEY REFERENCES users(discord_id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(title IN ('captain','manager')),team_name TEXT NOT NULL,
 assigned_by TEXT NOT NULL REFERENCES users(discord_id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS member_team_titles (
 discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,team_id TEXT NOT NULL,
 title TEXT NOT NULL CHECK(title IN ('captain','manager')),team_name TEXT NOT NULL,division TEXT NOT NULL DEFAULT '',
 assigned_by TEXT NOT NULL REFERENCES users(discord_id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(discord_id,team_id))`).run();
 // Only backfill accounts with no multi-team records. Never re-add a removed assignment.
 await env.DB.prepare(`INSERT OR IGNORE INTO member_team_titles(discord_id,team_id,title,team_name,division,assigned_by,created_at,updated_at)
 SELECT m.discord_id,'legacy:'||m.team_name,m.title,m.team_name,'',m.assigned_by,m.created_at,m.updated_at
 FROM member_titles m WHERE NOT EXISTS(SELECT 1 FROM member_team_titles t WHERE t.discord_id=m.discord_id)`).run();
}
export async function memberTeamTitles(env,discordId){
 const statement=env.DB.prepare(`SELECT discord_id AS userId,team_id AS teamId,title,team_name AS teamName,division
 FROM member_team_titles ${discordId?'WHERE discord_id = ?':''} ORDER BY created_at,team_id`);
 const rows=(await (discordId?statement.bind(String(discordId)):statement).all()).results;
 const teams=memberTitleTeams();
 return rows.map(row=>{
  if(row.teamId.startsWith('legacy:')){
   const matches=teams.filter(t=>t.name===row.teamName);
   if(matches.length===1)return {...row,teamId:matches[0].id,division:matches[0].division};
  }
  return row;
 });
}
export function validateTeamTitles(input,existing=[]){
 if(!Array.isArray(input)||input.length>10)throw Error('Choose up to 10 team assignments.');
 const teams=memberTitleTeams(),seen=new Set();
 return input.map(item=>{
  if(!item||!['captain','manager'].includes(item.title)||typeof item.teamId!=='string')throw Error('Choose a role and team for each assignment.');
  const known=teams.find(t=>t.id===item.teamId),legacy=existing.find(t=>t.teamId===item.teamId&&t.teamId.startsWith('legacy:'));
  if(!known&&!legacy)throw Error('Choose a current team and division.');
  if(seen.has(item.teamId))throw Error('Choose each team only once.');
  seen.add(item.teamId);
  return {teamId:item.teamId,title:item.title,teamName:known?.name||legacy.teamName,division:known?.division||legacy.division||''};
 });
}
