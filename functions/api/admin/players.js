import {json} from '../../_lib/auth.js';
import {rosterGuard,rosterSnapshot,discordName} from '../../_lib/league-rosters.js';
import {ROSTER_CLUBS} from '../../_lib/roster-clubs.js';
export async function onRequestGet({request,env}){
 const guard=await rosterGuard(request,env);if(guard.response)return guard.response;
 const {people}=await rosterSnapshot(env);return json({players:people,clubs:ROSTER_CLUBS,season:'2'});
}
export async function onRequestPost({request,env}){
 const guard=await rosterGuard(request,env,true);if(guard.response)return guard.response;
 let body;try{body=await request.json();}catch{return json({error:'Invalid request.'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid request.'},400);
 const actor=String(guard.actor.discord_id);
 if(body.action==='create'){
  let name;try{name=discordName(body.discordName);}catch(e){return json({error:e.message},400);}
  const id=`player-${crypto.randomUUID()}`;
  // Insert/select runs atomically; duplicate names require choosing an existing record.
  const results=await env.DB.batch([
   env.DB.prepare('INSERT INTO league_players(id,discord_name,normalized_name,created_by) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM league_players WHERE normalized_name=?)').bind(id,name.name,name.normalized,actor,name.normalized),
   env.DB.prepare("INSERT INTO audit_log(actor_discord_id,action,details) SELECT ?,'league_player_added',? WHERE EXISTS(SELECT 1 FROM league_players WHERE id=?)").bind(actor,JSON.stringify({playerId:id,discordName:name.name}),id)
  ]);
  const result=results[0];
  if(!result.meta?.changes)return json({error:'That Discord name already exists. Find the existing player below instead.'},409);
  return json({ok:true,id},201);
 }
 if(body.action!=='assign')return json({error:'Unknown roster action.'},400);
 if(body.season!=='2'||!['6v6','10v10'].includes(body.division))return json({error:'Only current Season 2 rosters can be edited.'},400);
 const team=body.team===null||body.team===''?null:body.team;
 if(team!==null&&!ROSTER_CLUBS[body.division].some(c=>c.key===team))return json({error:'Choose a team in that division.'},400);
 const player=await env.DB.prepare('SELECT id FROM league_players WHERE id=?').bind(String(body.playerId||'')).first();if(!player)return json({error:'Player not found.'},404);
 await env.DB.batch([
  env.DB.prepare(`INSERT INTO league_roster_memberships(player_id,season,division,profile_id,team_key,updated_by) VALUES(?,'2',?,?,?,?)
   ON CONFLICT(player_id,season,division) DO UPDATE SET team_key=excluded.team_key,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).bind(player.id,body.division,player.id,team,actor),
  env.DB.prepare("INSERT INTO audit_log(actor_discord_id,action,details) VALUES(?,'league_roster_assigned',?)").bind(actor,JSON.stringify({playerId:player.id,season:'2',division:body.division,team}))
 ]);
 return json({ok:true});
}
