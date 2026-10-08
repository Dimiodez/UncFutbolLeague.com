import {json,randomToken,sha256} from './auth.js';
import {gamingProfile,saveProfile,canManage} from './preview-membership.js';
const staff=user=>['owner','admin'].includes(user?.role);
const text=(v,label)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>80)throw Error(`Enter ${label} (up to 80 characters).`);return v.trim();};
export async function dashboardAction(request,env,user,input,url){
 const action=input.action,db=env.DB;
 if(request.method==='GET'&&url.searchParams.has('mine')){
  if(!user)return json({error:'Sign in with Discord first.'},401);
  const teams=(await db.prepare(`SELECT t.id,t.board_id,t.name,t.ea_id,t.status,d.in_game_name,b.settings,b.is_open,b.expires,COALESCE(m.active,0) AS manager_active FROM preview_team_requests t JOIN preview_registration_boards b ON b.id=t.board_id LEFT JOIN preview_team_details d ON d.team_id=t.id LEFT JOIN preview_league_managers m ON m.board_id=t.board_id AND m.user_id=t.manager_id WHERE t.manager_id=?`).bind(user.discord_id).all()).results;
  const applications=(await db.prepare(`SELECT p.board_id,p.team_id,p.status,t.name,b.settings,b.is_open,b.expires FROM preview_player_requests p JOIN preview_team_requests t ON t.id=p.team_id JOIN preview_registration_boards b ON b.id=p.board_id WHERE p.user_id=?`).bind(user.discord_id).all()).results;
  const players=(await db.prepare(`SELECT p.team_id,p.display_name,p.status,g.platform,g.account_name FROM preview_player_requests p JOIN preview_team_requests t ON t.id=p.team_id LEFT JOIN preview_gaming_profiles g ON g.user_id=p.user_id JOIN preview_league_managers m ON m.board_id=t.board_id AND m.user_id=t.manager_id AND m.active=1 WHERE t.manager_id=?`).bind(user.discord_id).all()).results;
  const profile=await db.prepare('SELECT platform,account_name AS accountName FROM preview_gaming_profiles WHERE user_id=?').bind(user.discord_id).first();
  const boards=staff(user)?(await db.prepare('SELECT id,settings,is_open,expires FROM preview_registration_boards ORDER BY expires DESC').all()).results:[];
  return json({user:{id:user.discord_id,name:user.display_name,staff:staff(user)},profile,teams:teams.map(t=>({...t,settings:JSON.parse(t.settings)})),applications:applications.map(p=>({...p,settings:JSON.parse(p.settings)})),players,boards:boards.map(b=>({...b,settings:JSON.parse(b.settings)}))});
 }
 if(action==='profile'){
  await saveProfile(db,user.discord_id,gamingProfile(input)).run();return json({saved:true});
 }
 if(action==='dashboardTeam'){
  const team=await db.prepare('SELECT * FROM preview_team_requests WHERE id=?').bind(input.teamId).first();
  if(!team||!staff(user)&&(team.manager_id!==user.discord_id||!await canManage(db,user,team.board_id)))return json({error:'Only this team’s authorized manager or league staff may edit it.'},403);
  const name=text(input.name,'a displayed team name'),inGameName=text(input.inGameName,'an in-game team name');
  await db.batch([db.prepare('UPDATE preview_team_requests SET name=?,name_key=? WHERE id=?').bind(name,name.toLowerCase(),team.id),db.prepare('INSERT INTO preview_team_details(team_id,in_game_name) VALUES(?,?) ON CONFLICT(team_id) DO UPDATE SET in_game_name=excluded.in_game_name').bind(team.id,inGameName)]);return json({saved:true});
 }
 if(action==='rollover'){
  if(!staff(user))return json({error:'Only a website owner/admin may roll teams into another season.'},403);
  if(input.confirm!==true||typeof input.includeRoster!=='boolean'||!Array.isArray(input.teams)||!input.teams.length||input.teams.length>40)throw Error('Review and confirm 1–40 selected teams and the roster option.');
  if(input.sourceBoardId===input.boardId)throw Error('Choose a different season.');
  const source=await db.prepare('SELECT * FROM preview_registration_boards WHERE id=?').bind(input.sourceBoardId).first(),target=await db.prepare('SELECT * FROM preview_registration_boards WHERE id=?').bind(input.boardId).first();
  if(!source||!target)throw Error('Create shared registration for both leagues first.');
  const from=JSON.parse(source.settings),to=JSON.parse(target.settings);
  if(from.season.trim().toLowerCase()===to.season.trim().toLowerCase()||from.format!==to.format||from.size!==to.size||to.startDate<=from.startDate)throw Error('Choose a later season start date and the same playing format.');
  if(target.expires<Date.now())throw Error('The destination invitation has expired.');
  const eligible=(await db.prepare(`SELECT t.*,d.in_game_name FROM preview_team_requests t LEFT JOIN preview_team_details d ON d.team_id=t.id JOIN users u ON u.discord_id=t.manager_id AND u.status='active' JOIN preview_league_managers m ON m.board_id=t.board_id AND m.user_id=t.manager_id AND m.active=1 WHERE t.board_id=? AND t.status='approved'`).bind(source.id).all()).results;
  const ids=new Set(),selectedTeams=[];
  for(const selected of input.teams){
   if(ids.has(selected.teamId))throw Error('Select each team once.');ids.add(selected.teamId);
   const team=eligible.find(t=>t.id===selected.teamId);
   if(!team)throw Error('Only approved teams with active, authorized managers can roll over.');
   const name=text(selected.name??team.name,'a displayed team name'),inGameName=text(selected.inGameName??team.in_game_name,'an in-game team name'),id=randomToken(18);
   selectedTeams.push({id,sourceId:team.id,name,nameKey:name.toLowerCase(),inGameName,managerId:team.manager_id,managerName:team.manager_name,eaId:team.ea_id,hash:await sha256(randomToken(32))});
  }
  const payload=JSON.stringify(selectedTeams),statements=[
   db.prepare('INSERT INTO preview_rollover_batches(target_board,source_board,actor,guard_count) VALUES(?,?,?,(SELECT COUNT(*) FROM preview_team_requests WHERE board_id=?))').bind(target.id,source.id,user.discord_id,target.id),
   db.prepare(`INSERT INTO preview_team_rollovers(new_team_id,old_team_id,from_board,to_board,roster_count,roster_limit) SELECT json_extract(value,'$.id'),json_extract(value,'$.sourceId'),?,?,CASE WHEN ? THEN (SELECT COUNT(*) FROM preview_roster_members r JOIN users u ON u.discord_id=r.user_id AND u.status='active' WHERE r.board_id=? AND r.team_id=json_extract(j.value,'$.sourceId')) ELSE 0 END,? FROM json_each(?) j`).bind(source.id,target.id,input.includeRoster?1:0,source.id,to.maxTeamSize,payload),
   db.prepare(`INSERT INTO preview_team_requests(id,board_id,manager_id,manager_name,name,name_key,ea_id,status,player_hash) SELECT json_extract(value,'$.id'),?,json_extract(value,'$.managerId'),json_extract(value,'$.managerName'),json_extract(value,'$.name'),json_extract(value,'$.nameKey'),json_extract(value,'$.eaId'),'approved',json_extract(value,'$.hash') FROM json_each(?)`).bind(target.id,payload),
   db.prepare(`INSERT INTO preview_team_details(team_id,in_game_name) SELECT json_extract(value,'$.id'),json_extract(value,'$.inGameName') FROM json_each(?)`).bind(payload),
   db.prepare(`INSERT INTO preview_league_managers(board_id,user_id,active,assigned_by) SELECT ?,json_extract(value,'$.managerId'),1,? FROM json_each(?) WHERE true ON CONFLICT(board_id,user_id) DO UPDATE SET active=1,assigned_by=excluded.assigned_by`).bind(target.id,user.discord_id,payload)
  ];
  if(input.includeRoster)statements.push(
   db.prepare(`INSERT INTO preview_player_requests(team_id,board_id,user_id,display_name,ea_name,status) SELECT json_extract(j.value,'$.id'),?,r.user_id,u.display_name,COALESCE(g.account_name,p.ea_name,'Legacy ID needs updating'),'approved' FROM json_each(?) j JOIN preview_roster_members r ON r.team_id=json_extract(j.value,'$.sourceId') AND r.board_id=? JOIN users u ON u.discord_id=r.user_id AND u.status='active' LEFT JOIN preview_gaming_profiles g ON g.user_id=r.user_id LEFT JOIN preview_player_requests p ON p.board_id=r.board_id AND p.user_id=r.user_id`).bind(target.id,payload,source.id),
   db.prepare(`INSERT INTO preview_roster_members(board_id,team_id,user_id,approved_by) SELECT ?,json_extract(j.value,'$.id'),r.user_id,? FROM json_each(?) j JOIN preview_roster_members r ON r.team_id=json_extract(j.value,'$.sourceId') AND r.board_id=? JOIN users u ON u.discord_id=r.user_id AND u.status='active'`).bind(target.id,user.discord_id,payload,source.id)
  );
  await db.batch(statements);return json({rolledOver:input.teams.length,includeRoster:input.includeRoster,note:'Saved online in the preview. Old season records are unchanged; fixtures, results and awards were not copied.'});
 }
 return null;
}
