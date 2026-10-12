import {getSession,json,sameOrigin} from './auth.js';
import {ROSTER_CLUBS} from './roster-clubs.js';
import {rosterSnapshot} from './league-rosters.js';
import {validatePlaybook} from '../../team-tactics-model.js';
export const HUB_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS team_hub_managers(season TEXT NOT NULL,division TEXT NOT NULL,team_key TEXT NOT NULL,discord_id TEXT NOT NULL REFERENCES users(discord_id),assigned_by TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(season,division,team_key,discord_id))`,
 `CREATE TABLE IF NOT EXISTS team_hub_accounts(discord_id TEXT PRIMARY KEY REFERENCES users(discord_id),player_id TEXT NOT NULL UNIQUE REFERENCES league_players(id),assigned_by TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 `CREATE TABLE IF NOT EXISTS team_hub_playbooks(season TEXT NOT NULL,division TEXT NOT NULL,team_key TEXT NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL,updated_by TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(season,division,team_key))`
];
export async function ensureHubs(db){for(const sql of HUB_SCHEMA)await db.prepare(sql).run();}
export const hubTeams=()=>Object.entries(ROSTER_CLUBS).flatMap(([division,teams])=>teams.map(t=>({id:division+':'+t.key,key:t.key,name:t.name,division,season:'2'})));
export async function hubContext(db,actor,team){
 const manager=!!await db.prepare("SELECT 1 AS allowed FROM team_hub_managers WHERE season='2' AND division=? AND team_key=? AND discord_id=?").bind(team.division,team.key,actor.discord_id).first();
 const member=!!await db.prepare(`SELECT 1 AS allowed FROM team_hub_accounts a JOIN league_roster_memberships m ON m.player_id=a.player_id WHERE a.discord_id=? AND m.season='2' AND m.division=? AND m.team_key=? AND NOT EXISTS(SELECT 1 FROM league_player_aliases old WHERE old.alias_id=a.player_id)`).bind(actor.discord_id,team.division,team.key).first();
 return {allowed:manager||member||actor.role==='owner',canEdit:manager,isOwner:actor.role==='owner'};
}
export async function liveTeamHub(request,env){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 const actor=await getSession(request,env);if(!actor)return json({error:'Sign in with Discord to open your private team hub.'},401);
 await ensureHubs(env.DB);
 let input; if(request.method==='POST'){const raw=await request.text();if(raw.length>250000)return json({error:'Playbook too large.'},413);try{input=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}if(!input||typeof input!=='object')return json({error:'Invalid request.'},400);}
 const id=request.method==='GET'?new URL(request.url).searchParams.get('team'):input.teamId;
 if(!id&&request.method==='GET'){
  const teams=[];for(const team of hubTeams()){const access=await hubContext(env.DB,actor,team);if(access.allowed)teams.push({...team,...access});}
  return json({teams,accountId:actor.discord_id,canAssign:['owner','admin'].includes(actor.role)});
 }
 const team=hubTeams().find(t=>t.id===id);if(!team)return json({error:'Team not found.'},404);
 const access=await hubContext(env.DB,actor,team);if(!access.allowed)return json({error:'This team hub is private to its assigned managers, linked roster members and the owner.'},403);
 const {players}=await rosterSnapshot(env),roster=players[team.division].filter(p=>p.club===team.key).map(p=>({id:String(p.identity),name:p.name}));
 if(request.method==='GET'){
  const row=await env.DB.prepare("SELECT payload,revision,updated_at FROM team_hub_playbooks WHERE season='2' AND division=? AND team_key=?").bind(team.division,team.key).first();
  return json({team:{...team,...access,league:`Season 2 · ${team.division}`,logo:'/assets/ufl-mark.webp',publicUrl:`/clubs/${encodeURIComponent(team.key)}?season=2&division=${team.division}`},roster,rosterSource:'Current registered team roster · new players appear automatically',playbook:row?JSON.parse(row.payload):{version:1,boards:[]},revision:row?.revision||0,updatedAt:row?.updated_at||null,accountId:actor.discord_id});
 }
 if(!access.canEdit)return json({error:'Only this team’s assigned managers can edit tactics. Owner inspection is read-only unless also assigned as a manager.'},403);
 if(input.accountId!==actor.discord_id||!Number.isSafeInteger(input.revision)||input.revision<0)return json({error:'Account changed or invalid revision. Reload before saving.'},409);
 let payload;try{payload=JSON.stringify(validatePlaybook(input.playbook,roster));}catch(e){return json({error:e.message},400);}
 const result=input.revision===0?await env.DB.prepare("INSERT OR IGNORE INTO team_hub_playbooks(season,division,team_key,payload,revision,updated_by) VALUES('2',?,?,?,1,?)").bind(team.division,team.key,payload,actor.discord_id).run():await env.DB.prepare("UPDATE team_hub_playbooks SET payload=?,revision=revision+1,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE season='2' AND division=? AND team_key=? AND revision=?").bind(payload,actor.discord_id,team.division,team.key,input.revision).run();
 if(!result.meta.changes)return json({error:'Another manager saved newer changes. Your edits remain open; reload before saving.'},409);
 return json({saved:true,revision:input.revision+1});
}
