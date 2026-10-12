import {getSession,json,sameOrigin} from '../_lib/auth.js';
import {ensureHubs,hubTeams} from '../_lib/team-hub.js';
import {rosterSnapshot} from '../_lib/league-rosters.js';
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 const actor=await getSession(request,env);if(!actor||!['owner','admin'].includes(actor.role))return json({error:'Owner or administrator access required.'},403);
 await ensureHubs(env.DB);
 if(request.method==='GET'){
  const users=(await env.DB.prepare("SELECT discord_id AS id,username,display_name AS name FROM users WHERE status='active' ORDER BY display_name COLLATE NOCASE").all()).results;
  const managers=(await env.DB.prepare("SELECT division,team_key,discord_id FROM team_hub_managers WHERE season='2'").all()).results;
  const links=(await env.DB.prepare('SELECT discord_id,player_id FROM team_hub_accounts').all()).results;
  return json({accountId:actor.discord_id,teams:hubTeams(),users,managers,links,players:(await rosterSnapshot(env)).people});
 }
 let b;try{b=await request.json();}catch{return json({error:'Invalid request.'},400);}
 if(!b||b.accountId!==actor.discord_id)return json({error:'Account changed. Reload before assigning access.'},409);
 const user=typeof b.userId==='string'?await env.DB.prepare("SELECT discord_id FROM users WHERE discord_id=? AND status='active'").bind(b.userId).first():null;
 if(!user)return json({error:'Choose an active user who has signed in to the site.'},400);
 let statement,details={userId:b.userId};
 if(['grant-manager','revoke-manager'].includes(b.action)){
  const team=hubTeams().find(t=>t.id===b.teamId);if(!team)return json({error:'Choose a valid team and division.'},400);
  statement=b.action==='grant-manager'?env.DB.prepare("INSERT OR IGNORE INTO team_hub_managers(season,division,team_key,discord_id,assigned_by) VALUES('2',?,?,?,?)").bind(team.division,team.key,b.userId,actor.discord_id):env.DB.prepare("DELETE FROM team_hub_managers WHERE season='2' AND division=? AND team_key=? AND discord_id=?").bind(team.division,team.key,b.userId);
  details.teamId=team.id;
 }else if(b.action==='link-player'){
  const player=await env.DB.prepare('SELECT id FROM league_players WHERE id=? AND NOT EXISTS(SELECT 1 FROM league_player_aliases WHERE alias_id=league_players.id)').bind(String(b.playerId||'')).first();if(!player)return json({error:'Choose a current canonical roster player.'},400);
  const linked=await env.DB.prepare('SELECT discord_id FROM team_hub_accounts WHERE player_id=?').bind(player.id).first();if(linked&&linked.discord_id!==b.userId)return json({error:'That player is already linked to another account. Unlink it first.'},409);
  statement=env.DB.prepare('INSERT INTO team_hub_accounts(discord_id,player_id,assigned_by) VALUES(?,?,?) ON CONFLICT(discord_id) DO UPDATE SET player_id=excluded.player_id,assigned_by=excluded.assigned_by,updated_at=CURRENT_TIMESTAMP').bind(b.userId,player.id,actor.discord_id);details.playerId=player.id;
 }else if(b.action==='unlink-player')statement=env.DB.prepare('DELETE FROM team_hub_accounts WHERE discord_id=?').bind(b.userId);
 else return json({error:'Unknown access action.'},400);
 try{await env.DB.batch([statement,env.DB.prepare('INSERT INTO audit_log(actor_discord_id,action,target_discord_id,details) VALUES(?,?,?,?)').bind(actor.discord_id,'team_hub_'+b.action,b.userId,JSON.stringify(details))]);}catch(e){if(String(e).includes('UNIQUE'))return json({error:'That player was just linked elsewhere. Reload the assignments.'},409);throw e;}
 return json({saved:true});
}
