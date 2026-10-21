import {getSession,json,sameOrigin} from './auth.js';
import {ensureRegistrationSchema} from './preview-registration.js';
import {canManage} from './preview-membership.js';
import {validatePlaybook} from '../../team-tactics-model.js';
import {ROMA_ROSTER} from '../../team-hub-roma.js';
const staff=u=>['owner','admin'].includes(u?.role);
const ROMA='roma-workshop';
const roma={id:ROMA,name:'UFL Roma',league:'6v6 · Season 2',sandbox:true,logo:'/assets/league/club-1790181744567-crest.png',publicUrl:'/clubs/ROM?season=2&division=6v6'};
async function romaRoster(){
 try{const r=await fetch('https://www.uncfutbolleague.com/api/league-rosters',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Unavailable');const d=await r.json(),players=d.players?.['6v6']?.filter(p=>p.club==='ROM');if(!players?.length)throw Error('Empty roster');return {roster:players.map(p=>({id:String(p.identity||p.id),name:p.name})),rosterSource:'Current public Season 2 roster'};}
 catch{return {roster:ROMA_ROSTER,rosterSource:'Saved Season 2 roster snapshot · live roster check unavailable'};}
}
async function teamAccess(db,user,id){
 if(id===ROMA)return staff(user)?{...roma,canEdit:true}:null;
 const t=await db.prepare('SELECT t.*,b.settings FROM preview_team_requests t JOIN preview_registration_boards b ON b.id=t.board_id WHERE t.id=?').bind(id).first();
 if(!t)return null;
 const manager=t.manager_id===user.discord_id&&await canManage(db,user,t.board_id);
 const member=await db.prepare('SELECT user_id FROM preview_roster_members WHERE team_id=? AND board_id=? AND user_id=?').bind(t.id,t.board_id,user.discord_id).first();
 if(!staff(user)&&!manager&&!member)return null;
 const s=JSON.parse(t.settings);return {id:t.id,name:t.name,league:`${s.league} · ${s.season}`,canEdit:staff(user)||!!manager,boardId:t.board_id,sandbox:false,logo:'/assets/ufl-mark.webp',publicUrl:'/league-dashboard'};
}
export async function previewTeamHubApi(request,env){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 try{
  const user=await getSession(request,env);if(!user)return json({error:'Sign in with Discord to open your private team hub.'},401);
  await ensureRegistrationSchema(env.DB);
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS preview_team_playbooks(team_id TEXT PRIMARY KEY,payload TEXT NOT NULL,revision INTEGER NOT NULL,updated_by TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  const url=new URL(request.url);let input;
  if(request.method==='POST'){const raw=await request.text();if(new TextEncoder().encode(raw).length>250000)return json({error:'Playbook is too large.'},413);try{input=JSON.parse(raw);}catch{return json({error:'Invalid playbook.'},400);}if(!input||typeof input!=='object')return json({error:'Invalid playbook.'},400);}
  const id=request.method==='GET'?url.searchParams.get('team'):input.teamId;
  if(!id&&request.method==='GET'){
   const rows=(await env.DB.prepare(`SELECT DISTINCT t.id FROM preview_team_requests t LEFT JOIN preview_roster_members r ON r.team_id=t.id WHERE t.manager_id=? OR r.user_id=?`).bind(user.discord_id,user.discord_id).all()).results;
   const teams=[];for(const row of rows){const t=await teamAccess(env.DB,user,row.id);if(t)teams.push(t);}if(staff(user))teams.unshift({...roma,canEdit:true});
   return json({teams,accountId:user.discord_id});
  }
  if(typeof id!=='string'||id.length>100)return json({error:'Choose a team hub.'},400);
  const team=await teamAccess(env.DB,user,id);if(!team)return json({error:'This private hub is available only to this team’s authorized managers, registered players and league administrators.'},403);
  const context=id===ROMA?await romaRoster():{roster:(await env.DB.prepare(`SELECT r.user_id AS id,u.display_name AS name FROM preview_roster_members r JOIN users u ON u.discord_id=r.user_id WHERE r.team_id=? AND r.board_id=? AND u.status='active' ORDER BY u.display_name`).bind(id,team.boardId).all()).results,rosterSource:'Approved workshop team roster'};
  if(request.method==='GET'){const row=await env.DB.prepare('SELECT payload,revision,updated_at FROM preview_team_playbooks WHERE team_id=?').bind(id).first();return json({team,...context,accountId:user.discord_id,playbook:row?JSON.parse(row.payload):{version:1,boards:[]},revision:row?.revision||0,updatedAt:row?.updated_at||null});}
  if(!team.canEdit)return json({error:'Only this team’s authorized managers or league administrators can edit tactics.'},403);
  if(input.accountId!==user.discord_id)return json({error:'Your account changed. Reload the hub before saving.'},409);
  if(!Number.isSafeInteger(input.revision)||input.revision<0)return json({error:'Reload the hub before saving.'},400);
  let payload;try{payload=JSON.stringify(validatePlaybook(input.playbook,context.roster));}catch(e){return json({error:e.message},400);}
  const saved=input.revision===0?await env.DB.prepare('INSERT OR IGNORE INTO preview_team_playbooks(team_id,payload,revision,updated_by) VALUES(?,?,1,?)').bind(id,payload,user.discord_id).run():await env.DB.prepare('UPDATE preview_team_playbooks SET payload=?,revision=revision+1,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE team_id=? AND revision=?').bind(payload,user.discord_id,id,input.revision).run();
  if(!saved.meta.changes)return json({error:'Another manager saved newer changes. Your edits are still open. Reload the saved playbook before trying again.'},409);
  return json({saved:true,revision:input.revision+1});
 }catch(e){console.error('Team hub unavailable',String(e));return json({error:'Team hub storage is unavailable. Try again shortly.'},503);}
}
