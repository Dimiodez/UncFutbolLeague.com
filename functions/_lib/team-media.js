import {ROSTER_CLUBS} from './roster-clubs.js';
export const mediaStaff=actor=>Boolean(actor&&['owner','admin'].includes(actor.role));
export function mediaTeam(division,key){
 return ['6v6','10v10'].includes(division)&&ROSTER_CLUBS[division].some(team=>team.key===key);
}
export async function canManageTeam(env,actor,division,key){
 if(!actor||!mediaTeam(division,key))return false;
 if(mediaStaff(actor))return true;
 return Boolean(await env.DB.prepare("SELECT 1 AS allowed FROM team_media_managers WHERE discord_id=? AND season='2' AND division=? AND team_key=?").bind(String(actor.discord_id),division,key).first());
}
export async function canSubmitPlayer(env,actor,identity){
 if(mediaStaff(actor))return true;
 if(!actor)return false;
 return Boolean(await env.DB.prepare(`SELECT 1 AS allowed FROM league_roster_memberships m
 JOIN team_media_managers g ON g.season=m.season AND g.division=m.division AND g.team_key=m.team_key
 WHERE m.player_id=? AND m.season='2' AND g.discord_id=? LIMIT 1`).bind(identity,String(actor.discord_id)).first());
}
