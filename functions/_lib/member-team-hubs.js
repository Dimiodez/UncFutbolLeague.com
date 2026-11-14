import {json} from './auth.js';
import {TEAM_REGISTRATION_SCHEMA} from './team-registration.js';
import {validatePlaybook} from '../../team-tactics-model.js';
const staff=actor=>['owner','admin'].includes(actor.role);
const eligible="EXISTS(SELECT 1 FROM member_team_applications a WHERE a.team_id=t.id AND a.status='approved')";
export async function acceptedMemberHubs(db,actor){
 await db.batch(TEAM_REGISTRATION_SCHEMA.map(sql=>db.prepare(sql)));
 const teams=(await db.prepare(`SELECT t.id,t.name,l.season,l.format FROM member_teams t JOIN member_team_hubs h ON h.team_id=t.id JOIN member_team_applications a ON a.team_id=t.id AND a.status='approved' JOIN member_team_leagues l ON l.id=a.league_id WHERE ${eligible} AND (t.manager_id=? OR ?=1) ORDER BY t.name,l.season`).bind(actor.discord_id,staff(actor)?1:0).all()).results;
 return [...new Map(teams.map(t=>[t.id,{id:'member:'+t.id,key:t.id,name:t.name,division:t.format,season:t.season,memberTeam:true,allowed:true,canEdit:true,isOwner:actor.role==='owner'}])).values()];
}
export async function memberTeamHub(request,env,actor,id,input){
 await env.DB.batch(TEAM_REGISTRATION_SCHEMA.map(sql=>env.DB.prepare(sql)));
 const key=id.slice('member:'.length),db=env.DB;
 const team=await db.prepare(`SELECT t.*,u.display_name AS manager_name FROM member_teams t JOIN users u ON u.discord_id=t.manager_id JOIN member_team_hubs h ON h.team_id=t.id WHERE t.id=? AND ${eligible}`).bind(key).first();
 if(!team)return json({error:'A team hub becomes available after owner/admin accepts the team into a league.'},404);
 if(!staff(actor)&&team.manager_id!==actor.discord_id)return json({error:'This team hub is private to its current manager and league staff.'},403);
 const leagues=(await db.prepare("SELECT l.id,l.name,l.season,l.format FROM member_team_applications a JOIN member_team_leagues l ON l.id=a.league_id WHERE a.team_id=? AND a.status='approved' ORDER BY l.season,l.name").bind(key).all()).results;
 const roster=[];
 if(request.method==='GET'){
  const hub=await db.prepare('SELECT * FROM member_team_hubs WHERE team_id=?').bind(key).first();
  return json({team:{id,key,name:team.name,division:leagues[0].format,season:leagues[0].season,memberTeam:true,canEdit:true,canAssign:staff(actor),league:leagues.map(l=>l.name+' · '+l.season).join(' / '),acceptedLeagues:leagues,managerName:team.manager_name,eaClubName:team.ea_club_name,eaClubId:team.ea_club_id,logo:'/assets/ufl-mark.webp',publicUrl:'/my-teams',publicLabel:'Team registration →'},roster,rosterSource:'Newly accepted team · no registered players yet.',playbook:JSON.parse(hub.payload),revision:hub.revision,updatedAt:hub.updated_at,accountId:actor.discord_id});
 }
 if(input.accountId!==actor.discord_id||!Number.isSafeInteger(input.revision)||input.revision<0)return json({error:'Account changed or invalid revision. Reload before saving.'},409);
 let payload;try{payload=JSON.stringify(validatePlaybook(input.playbook,roster));}catch(error){return json({error:error.message},400);}
 const result=await db.prepare(`UPDATE member_team_hubs SET payload=?,revision=revision+1,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE team_id=? AND revision=? AND EXISTS(SELECT 1 FROM member_teams t WHERE t.id=member_team_hubs.team_id AND (t.manager_id=? OR ?=1) AND ${eligible})`).bind(payload,actor.discord_id,key,input.revision,actor.discord_id,staff(actor)?1:0).run();
 if(!result.meta.changes)return json({error:'The playbook or team access changed. Reload before saving.'},409);
 return json({saved:true,revision:input.revision+1});
}
