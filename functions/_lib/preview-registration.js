import {getSession,json,sameOrigin,randomToken,sha256} from './auth.js';
import {validateScheduleSettings,registrationAllowed,leagueWindowState} from '../../league-engine.js';
const staff=user=>['owner','admin'].includes(user?.role);
const clean=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`Enter ${label} (up to ${max} characters).`);return value.trim();};
async function schema(db){await db.batch([
 db.prepare(`CREATE TABLE IF NOT EXISTS preview_registration_boards(id TEXT PRIMARY KEY, creator TEXT NOT NULL, settings TEXT NOT NULL, is_open INTEGER NOT NULL, expires INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE)`),
 db.prepare(`CREATE TABLE IF NOT EXISTS preview_team_requests(id TEXT PRIMARY KEY, board_id TEXT NOT NULL, manager_id TEXT NOT NULL, manager_name TEXT NOT NULL, name TEXT NOT NULL, name_key TEXT NOT NULL, ea_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', player_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(board_id,name_key), UNIQUE(board_id,manager_id))`),
 db.prepare(`CREATE TABLE IF NOT EXISTS preview_player_requests(team_id TEXT NOT NULL, board_id TEXT NOT NULL, user_id TEXT NOT NULL, display_name TEXT NOT NULL, ea_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(team_id,user_id), UNIQUE(board_id,user_id))`),
 db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS preview_request_ea_unique ON preview_team_requests(board_id,ea_id) WHERE ea_id<>''`)
]);}
// Shared intake only, isolated from live leagues. Link possession never grants staff rights.
export async function previewRegistrationApi(request,env){
 if(!env.DB)return json({error:'Preview registration storage is unavailable.'},503);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 try{
  const user=await getSession(request,env),url=new URL(request.url);
  let input={};if(request.method==='POST'){if(!user)return json({error:'Sign in with Discord first.'},401);const raw=await request.text();if(raw.length>32000)return json({error:'Request too large.'},413);try{input=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}}
  await schema(env.DB);
  const action=input.action;
  if(action==='create'||action==='update'){
   if(!staff(user))return json({error:'Only a website owner/admin can manage league invites.'},403);
   const s=validateScheduleSettings(input.settings);clean(s.league,80,'a league name');clean(s.season,80,'a season name');
   if(typeof input.open!=='boolean')throw Error('Choose registration open or closed.');
   // Only public registration metadata is stored, never the local result/award snapshot.
   const settings=JSON.stringify({league:s.league,season:s.season,format:s.format,size:s.size,maxTeamSize:s.maxTeamSize,keepersEnabled:s.keepersEnabled,startDate:s.startDate,time:s.time,timeZone:s.timeZone,weekday:s.weekday,spacingMinutes:s.spacingMinutes,windows:s.windows});
   if(action==='update'){
    const existing=await env.DB.prepare('SELECT id FROM preview_registration_boards WHERE id=?').bind(input.boardId).first();if(!existing)return json({error:'Registration board not found.'},404);
    await env.DB.prepare('UPDATE preview_registration_boards SET settings=?,is_open=? WHERE id=?').bind(settings,input.open?1:0,input.boardId).run();return json({updated:true});
   }
   const id=randomToken(18),token=randomToken(32),expires=Date.now()+90*86400000;
   await env.DB.prepare('INSERT INTO preview_registration_boards(id,creator,settings,is_open,expires,token_hash) VALUES (?,?,?,?,?,?)').bind(id,user.discord_id,settings,input.open?1:0,expires,await sha256(token)).run();
   return json({boardId:id,url:`${url.origin}/league-join.html#${token}`,expires});
  }
  if(request.method==='GET'&&url.searchParams.has('board')){
   if(!staff(user))return json({error:'Website owner/admin sign-in required.'},403);
   const id=url.searchParams.get('board'),board=await env.DB.prepare('SELECT id,is_open,expires FROM preview_registration_boards WHERE id=?').bind(id).first();if(!board)return json({error:'Registration board not found.'},404);
   const teams=(await env.DB.prepare('SELECT id,manager_id,manager_name,name,ea_id,status,created_at FROM preview_team_requests WHERE board_id=? ORDER BY created_at').bind(id).all()).results;
   const players=(await env.DB.prepare('SELECT p.* FROM preview_player_requests p JOIN preview_team_requests t ON t.id=p.team_id WHERE t.board_id=? ORDER BY p.created_at').bind(id).all()).results;
   return json({board,teams,players});
  }
  if(action==='approve'){
   if(!staff(user))return json({error:'Website owner/admin sign-in required.'},403);
   const result=await env.DB.prepare("UPDATE preview_team_requests SET status='approved' WHERE id=? AND board_id=?").bind(input.teamId,input.boardId).run();return json({approved:result.meta.changes>0});
  }
  if(action==='approvePlayer'){
   if(!staff(user))return json({error:'Website owner/admin sign-in required.'},403);
   const result=await env.DB.prepare("UPDATE preview_player_requests SET status='approved' WHERE team_id=? AND user_id=? AND board_id=?").bind(input.teamId,input.userId,input.boardId).run();return json({approved:result.meta.changes>0});
  }
  if(action==='playerLink'){
   const team=await env.DB.prepare('SELECT t.*,b.expires FROM preview_team_requests t JOIN preview_registration_boards b ON b.id=t.board_id WHERE t.id=?').bind(input.teamId).first();
   if(!team||!staff(user)&&team.manager_id!==user.discord_id)return json({error:'Only this team’s manager or website staff can create its player link.'},403);
   if(team.status!=='approved')return json({error:'The league administrator must approve the team first.'},409);
   if(team.expires<Date.now())return json({error:'This registration board has expired.'},410);
   const token=randomToken(32);await env.DB.prepare('UPDATE preview_team_requests SET player_hash=? WHERE id=?').bind(await sha256(token),team.id).run();
   return json({url:`${url.origin}/league-join.html#${token}`});
  }
  const token=input.token||url.searchParams.get('token');if(typeof token!=='string'||!/^[A-Za-z0-9_-]{40,64}$/.test(token))return json({error:'Invalid invitation.'},400);
  const hash=await sha256(token);let team=await env.DB.prepare('SELECT * FROM preview_team_requests WHERE player_hash=?').bind(hash).first();
  const board=team?await env.DB.prepare('SELECT * FROM preview_registration_boards WHERE id=?').bind(team.board_id).first():await env.DB.prepare('SELECT * FROM preview_registration_boards WHERE token_hash=?').bind(hash).first();
  if(!board)return json({error:'Invitation not found or replaced.'},404);if(board.expires<Date.now())return json({error:'This invitation has expired.'},410);
  const settings=JSON.parse(board.settings),open=registrationAllowed({settings,registrationOpen:!!board.is_open});
  if(!team&&user)team=await env.DB.prepare('SELECT * FROM preview_team_requests WHERE board_id=? AND manager_id=?').bind(board.id,user.discord_id).first();
  const playerInvite=!!(team&&team.player_hash===hash);
  if(request.method==='GET')return json({settings,open,kind:playerInvite?'player':'manager',user:user?{id:user.discord_id,name:user.display_name||user.username}:null,team:team?{id:team.id,name:team.name,status:team.status,isManager:user?.discord_id===team.manager_id}:null});
  if(action==='team'){
   if(playerInvite)return json({error:'Use a manager invitation to register a team.'},400);if(!open)return json({error:'Team registration is closed or outside its window.'},409);if(team)return json({error:'You already submitted a team for this league.'},409);
   const name=clean(input.name,80,'a team name'),eaId=String(input.eaClubId||'').trim();if(eaId&&!/^\d{1,20}$/.test(eaId))throw Error('Use a numeric EA club ID.');
   const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM preview_team_requests WHERE board_id=?').bind(board.id).first();if(count.total>=40)throw Error('This league has reached its 40-team limit.');
   if(eaId&&await env.DB.prepare('SELECT id FROM preview_team_requests WHERE board_id=? AND ea_id=?').bind(board.id,eaId).first())throw Error('That EA club has already been submitted.');
   const added=await env.DB.prepare('INSERT INTO preview_team_requests(id,board_id,manager_id,manager_name,name,name_key,ea_id,player_hash) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM preview_team_requests WHERE board_id=?)<40').bind(randomToken(18),board.id,user.discord_id,user.display_name||user.username,name,name.toLowerCase(),eaId,await sha256(randomToken(32)),board.id).run();if(!added.meta.changes)throw Error('This league has reached its 40-team limit.');return json({submitted:true});
  }
  if(action==='player'){
   if(!playerInvite||team.status!=='approved')return json({error:'An approved team invitation is required.'},403);
   const windows=settings.windows||[],transfers=windows.filter(w=>w.type==='transfer');
   if(!open&&!transfers.some(w=>leagueWindowState(w,settings.timeZone)==='open'))return json({error:'Player registration is outside registration/transfer windows.'},409);
   const eaName=clean(input.eaName,80,'your EA player name');
   const existing=await env.DB.prepare('SELECT p.team_id FROM preview_player_requests p JOIN preview_team_requests t ON t.id=p.team_id WHERE t.board_id=? AND p.user_id=?').bind(board.id,user.discord_id).first();if(existing)return json({error:'You have already joined or requested a team in this league.'},409);
   const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM preview_player_requests WHERE team_id=?').bind(team.id).first();if(count.total>=settings.maxTeamSize)throw Error('This team has reached its roster limit.');
   const added=await env.DB.prepare('INSERT INTO preview_player_requests(team_id,board_id,user_id,display_name,ea_name) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM preview_player_requests WHERE team_id=?)<?').bind(team.id,board.id,user.discord_id,user.display_name||user.username,eaName,team.id,settings.maxTeamSize).run();if(!added.meta.changes)throw Error('This team has reached its roster limit.');return json({submitted:true});
  }
  return json({error:'Unknown registration action.'},400);
 }catch(error){if(/UNIQUE constraint/.test(String(error)))return json({error:'This team or player was already submitted. Refresh before trying again.'},409);if(/D1_|SQLITE|no such table|syntax error|network|fetch failed/i.test(String(error))){console.error('Preview registration storage failed',String(error));return json({error:'Registration storage is unavailable. Try again later.'},503);}return json({error:error.message||'Registration is unavailable.'},400);}
}
