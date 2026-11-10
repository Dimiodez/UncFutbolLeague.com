import {ROSTER_CLUBS} from './roster-clubs.js';
export const mediaStaff=actor=>Boolean(actor&&['owner','admin'].includes(actor.role));
export function mediaTeam(division,key){
 return ['6v6','10v10'].includes(division)&&ROSTER_CLUBS[division].some(team=>team.key===key);
}
export async function canManageTeam(env,actor,division,key){
 if(!actor||!mediaTeam(division,key))return false;
 if(mediaStaff(actor))return true;
 const identity=String(actor.discord_id);
 if(await env.DB.prepare("SELECT 1 AS allowed FROM team_media_managers WHERE discord_id=? AND season='2' AND division=? AND team_key=?").bind(identity,division,key).first())return true;
 return Boolean(await optionalTeamTable('team_hub_managers',()=>env.DB.prepare("SELECT 1 AS allowed FROM team_hub_managers WHERE discord_id=? AND season='2' AND division=? AND team_key=?").bind(identity,division,key).first()));
}
export async function canSubmitPlayer(env,actor,identity){
 if(mediaStaff(actor))return true;
 if(!actor)return false;
 const check=table=>env.DB.prepare(`SELECT 1 AS allowed FROM league_roster_memberships m
 JOIN ${table} g ON g.season=m.season AND g.division=m.division AND g.team_key=m.team_key
 WHERE m.player_id=? AND m.season='2' AND g.discord_id=? LIMIT 1`).bind(identity,String(actor.discord_id)).first();
 return Boolean(await check('team_media_managers')||await optionalTeamTable('team_hub_managers',()=>check('team_hub_managers')));
}

export async function optionalTeamTable(table,query){
 try{return await query();}catch(error){
  if(String(error.message||error).includes('no such table: '+table))return null;
  throw error;
 }
}

export const TEAM_BANNERS_SCHEMA=`CREATE TABLE IF NOT EXISTS team_banner_publications (
 season TEXT NOT NULL CHECK(season='2'), division TEXT NOT NULL CHECK(division IN ('6v6','10v10')),
 team_key TEXT NOT NULL, asset_id TEXT NOT NULL REFERENCES team_media_assets(id),
 PRIMARY KEY(season,division,team_key)
)`;
