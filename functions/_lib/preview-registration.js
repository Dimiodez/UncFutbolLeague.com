import {getSession,json,sameOrigin,randomToken,sha256} from './auth.js';
import {validateScheduleSettings,registrationAllowed,leagueWindowState} from '../../league-engine.js';
import {membershipSchema,gamingProfile,saveProfile,canManage} from './preview-membership.js';
const staff=user=>['owner','admin'].includes(user?.role);
const clean=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`Enter ${label} (up to ${max} characters).`);return value.trim();};
async function schema(db){await db.batch([
 db.prepare(`CREATE TABLE IF NOT EXISTS preview_registration_boards(id TEXT PRIMARY KEY, creator TEXT NOT NULL, settings TEXT NOT NULL, is_open INTEGER NOT NULL, expires INTEGER NOT NULL, token_hash TEXT NOT NULL UNIQUE)`),
 db.prepare(`CREATE TABLE IF NOT EXISTS preview_team_requests(id TEXT PRIMARY KEY, board_id TEXT NOT NULL, manager_id TEXT NOT NULL, manager_name TEXT NOT NULL, name TEXT NOT NULL, name_key TEXT NOT NULL, ea_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', player_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(board_id,name_key), UNIQUE(board_id,manager_id))`),
 db.prepare(`CREATE TABLE IF NOT EXISTS preview_player_requests(team_id TEXT NOT NULL, board_id TEXT NOT NULL, user_id TEXT NOT NULL, display_name TEXT NOT NULL, ea_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(team_id,user_id), UNIQUE(board_id,user_id))`),
 db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS preview_request_ea_unique ON preview_team_requests(board_id,ea_id) WHERE ea_id<>''`)
]);await db.batch(membershipSchema.map(sql=>db.prepare(sql)));}
// Shared preview registrations and rosters, isolated from live leagues. Links never grant staff rights.
export async function previewRegistrationApi(request,env){
 if(!env.DB)return json({error:'Preview registration storage is unavailable.'},503);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 try{
  const user=await getSession(request,env),url=new URL(request.url);
  let input={};if(request.method==='POST'){if(!user)return json({error:'Sign in with Discord first.'},401);const raw=await request.text();if(raw.length>32000)return json({error:'Request too large.'},413);try{input=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}}
  await schema(env.DB);
  const action=input.action;
  if(action==='manager'){
   if(!staff(user))return json({error:'Only a website owner/admin can assign league managers.'},403);
   if(typeof input.active!=='boolean')throw Error('Choose whether manager access is enabled.');
   const board=await env.DB.prepare('SELECT id FROM preview_registration_boards WHERE id=?').bind(input.boardId).first();
   const target=await env.DB.prepare("SELECT discord_id FROM users WHERE discord_id=? AND status='active'").bind(input.userId).first();
   if(!board||!target)throw Error('Select an active registered user and a valid league.');
   await env.DB.prepare('INSERT INTO preview_league_managers(board_id,user_id,active,assigned_by) VALUES(?,?,?,?) ON CONFLICT(board_id,user_id) DO UPDATE SET active=excluded.active,assigned_by=excluded.assigned_by').bind(board.id,target.discord_id,input.active?1:0,user.discord_id).run();
   return json({updated:true});
  }
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
   const teams=(await env.DB.prepare('SELECT t.*,d.in_game_name,g.platform,g.account_name FROM preview_team_requests t LEFT JOIN preview_team_details d ON d.team_id=t.id LEFT JOIN preview_gaming_profiles g ON g.user_id=t.manager_id WHERE t.board_id=? ORDER BY t.created_at').bind(id).all()).results;
   const players=(await env.DB.prepare('SELECT p.*,g.platform,g.account_name FROM preview_player_requests p LEFT JOIN preview_gaming_profiles g ON g.user_id=p.user_id WHERE p.board_id=? ORDER BY p.created_at').bind(id).all()).results;
   const users=(await env.DB.prepare("SELECT u.discord_id AS id,u.display_name AS name,u.username,COALESCE(m.active,0) AS manager FROM users u LEFT JOIN preview_league_managers m ON m.user_id=u.discord_id AND m.board_id=? WHERE u.status='active' ORDER BY u.display_name COLLATE NOCASE").bind(id).all()).results;
   const roster=(await env.DB.prepare('SELECT r.*,u.display_name,g.platform,g.account_name FROM preview_roster_members r JOIN users u ON u.discord_id=r.user_id LEFT JOIN preview_gaming_profiles g ON g.user_id=r.user_id WHERE r.board_id=?').bind(id).all()).results;
   return json({board,teams,players,users,roster});
  }
  if(action==='approve'){
   if(!staff(user))return json({error:'Website owner/admin sign-in required.'},403);
   const result=await env.DB.prepare("UPDATE preview_team_requests SET status='approved' WHERE id=? AND board_id=?").bind(input.teamId,input.boardId).run();return json({approved:result.meta.changes>0});
  }
  if(action==='approvePlayer'){
   if(!staff(user))return json({error:'Website owner/admin sign-in required.'},403);
   const pending=await env.DB.prepare("SELECT p.user_id FROM preview_player_requests p JOIN preview_team_requests t ON t.id=p.team_id WHERE p.team_id=? AND p.user_id=? AND p.board_id=? AND t.status='approved'").bind(input.teamId,input.userId,input.boardId).first();
   if(!pending)throw Error('Player request or approved team not found.');
   const existing=await env.DB.prepare('SELECT team_id FROM preview_roster_members WHERE board_id=? AND user_id=?').bind(input.boardId,input.userId).first();
   if(existing&&existing.team_id!==input.teamId)return json({error:'This player already belongs to another team in this league.'},409);
   await env.DB.batch([env.DB.prepare('INSERT OR IGNORE INTO preview_roster_members(board_id,team_id,user_id,approved_by) VALUES(?,?,?,?)').bind(input.boardId,input.teamId,input.userId,user.discord_id),env.DB.prepare("UPDATE preview_player_requests SET status='approved' WHERE team_id=? AND user_id=? AND board_id=?").bind(input.teamId,input.userId,input.boardId)]);return json({approved:true});
  }
  if(action==='playerLink'){
   const team=await env.DB.prepare('SELECT t.*,b.expires FROM preview_team_requests t JOIN preview_registration_boards b ON b.id=t.board_id WHERE t.id=?').bind(input.teamId).first();
   if(!team||!staff(user)&&(team.manager_id!==user.discord_id||!await canManage(env.DB,user,team.board_id)))return json({error:'Only this team’s authorized manager or website staff can create its player link.'},403);
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
  const managerAccess=await canManage(env.DB,user,board.id),ownTeam=!!(team&&user?.discord_id===team.manager_id&&managerAccess);
  const profile=user?await env.DB.prepare('SELECT platform,account_name AS accountName FROM preview_gaming_profiles WHERE user_id=?').bind(user.discord_id).first():null;
  const details=team?await env.DB.prepare('SELECT in_game_name FROM preview_team_details WHERE team_id=?').bind(team.id).first():null;
  if(request.method==='GET'){
   const roster=team&&(ownTeam||staff(user))?(await env.DB.prepare('SELECT r.user_id,u.display_name,g.platform,g.account_name FROM preview_roster_members r JOIN users u ON u.discord_id=r.user_id LEFT JOIN preview_gaming_profiles g ON g.user_id=r.user_id WHERE r.board_id=? AND r.team_id=? ORDER BY u.display_name').bind(board.id,team.id).all()).results:[];
   const playerRequest=playerInvite&&user?await env.DB.prepare('SELECT status FROM preview_player_requests WHERE board_id=? AND user_id=?').bind(board.id,user.discord_id).first():null;
   return json({settings,open,managerAccess,profile,roster,playerRequest,kind:playerInvite?'player':'manager',user:user?{id:user.discord_id,name:user.display_name||user.username}:null,team:team?{id:team.id,name:team.name,inGameName:details?.in_game_name||'',eaClubId:team.ea_id,status:team.status,isManager:ownTeam}:null});
  }
  if(action==='updateTeam'){
   if(!team||!ownTeam&&!staff(user))return json({error:'Only this team’s authorized manager or website staff may edit it.'},403);
   const name=clean(input.name,80,'a displayed team name'),inGameName=clean(input.inGameName,80,'the in-game team name'),profile=gamingProfile(input);
   await env.DB.batch([env.DB.prepare('UPDATE preview_team_requests SET name=?,name_key=? WHERE id=?').bind(name,name.toLowerCase(),team.id),env.DB.prepare('INSERT INTO preview_team_details(team_id,in_game_name) VALUES(?,?) ON CONFLICT(team_id) DO UPDATE SET in_game_name=excluded.in_game_name').bind(team.id,inGameName),saveProfile(env.DB,user.discord_id,profile)]);
   return json({updated:true});
  }
  if(action==='team'){
   if(!managerAccess)return json({error:'A league owner/admin must authorize you as a Team Manager first.'},403);
   if(playerInvite)return json({error:'Use a manager invitation to register a team.'},400);if(!open)return json({error:'Team registration is closed or outside its window.'},409);if(team)return json({error:'You already submitted a team for this league.'},409);
   const name=clean(input.name,80,'a displayed team name'),inGameName=clean(input.inGameName,80,'the in-game team name'),profile=gamingProfile(input),eaId=String(input.eaClubId||'').trim();if(eaId&&!/^\d{1,20}$/.test(eaId))throw Error('Use a numeric EA club ID.');
   const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM preview_team_requests WHERE board_id=?').bind(board.id).first();if(count.total>=40)throw Error('This league has reached its 40-team limit.');
   if(eaId&&await env.DB.prepare('SELECT id FROM preview_team_requests WHERE board_id=? AND ea_id=?').bind(board.id,eaId).first())throw Error('That EA club has already been submitted.');
   const id=randomToken(18),added=await env.DB.batch([env.DB.prepare('INSERT INTO preview_team_requests(id,board_id,manager_id,manager_name,name,name_key,ea_id,player_hash) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM preview_team_requests WHERE board_id=?)<40').bind(id,board.id,user.discord_id,user.display_name||user.username,name,name.toLowerCase(),eaId,await sha256(randomToken(32)),board.id),env.DB.prepare('INSERT INTO preview_team_details(team_id,in_game_name) SELECT id,? FROM preview_team_requests WHERE id=?').bind(inGameName,id),saveProfile(env.DB,user.discord_id,profile)]);if(!added[0].meta.changes)throw Error('This league has reached its 40-team limit.');return json({submitted:true});
  }
  if(action==='player'){
   if(!playerInvite||team.status!=='approved')return json({error:'An approved team invitation is required.'},403);
   const windows=settings.windows||[],transfers=windows.filter(w=>w.type==='transfer');
   if(!open&&!transfers.some(w=>leagueWindowState(w,settings.timeZone)==='open'))return json({error:'Player registration is outside registration/transfer windows.'},409);
   const profile=gamingProfile(input),eaName=profile.accountName;
   const existing=await env.DB.prepare('SELECT p.team_id FROM preview_player_requests p JOIN preview_team_requests t ON t.id=p.team_id WHERE t.board_id=? AND p.user_id=?').bind(board.id,user.discord_id).first();if(existing)return json({error:'You have already joined or requested a team in this league.'},409);
   const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM preview_player_requests WHERE team_id=?').bind(team.id).first();if(count.total>=settings.maxTeamSize)throw Error('This team has reached its roster limit.');
   const added=await env.DB.batch([env.DB.prepare('INSERT INTO preview_player_requests(team_id,board_id,user_id,display_name,ea_name) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM preview_player_requests WHERE team_id=?)<?').bind(team.id,board.id,user.discord_id,user.display_name||user.username,eaName,team.id,settings.maxTeamSize),saveProfile(env.DB,user.discord_id,profile)]);if(!added[0].meta.changes)throw Error('This team has reached its roster limit.');return json({submitted:true});
  }
  return json({error:'Unknown registration action.'},400);
 }catch(error){if(/UNIQUE constraint/.test(String(error)))return json({error:'This team or player was already submitted. Refresh before trying again.'},409);if(/D1_|SQLITE|no such table|syntax error|network|fetch failed/i.test(String(error))){console.error('Preview registration storage failed',String(error));return json({error:'Registration storage is unavailable. Try again later.'},503);}return json({error:error.message||'Registration is unavailable.'},400);}
}
