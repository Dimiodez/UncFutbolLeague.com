import {getSession,json,sameOrigin,randomToken} from './auth.js';
import {consumeRateLimit} from './rate-limit.js';
import {searchEaClubs,verifyEaClub} from '../../league-suite-runtime/functions/_lib/ea-club-search.js';
import {registrationAllowed} from '../../league-suite-runtime/league-engine.js';

export const TEAM_REGISTRATION_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS member_teams(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,manager_id TEXT NOT NULL REFERENCES users(discord_id),created_by TEXT NOT NULL,ea_club_id TEXT,ea_club_name TEXT,ea_verified_at TEXT,revision INTEGER NOT NULL DEFAULT 1,last_write TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 `CREATE UNIQUE INDEX IF NOT EXISTS member_team_club ON member_teams(ea_club_id) WHERE ea_club_id IS NOT NULL`,
 `CREATE TABLE IF NOT EXISTS member_team_leagues(id TEXT PRIMARY KEY,name TEXT NOT NULL,season TEXT NOT NULL,format TEXT NOT NULL,is_open INTEGER NOT NULL DEFAULT 0,registration_settings TEXT NOT NULL,updated_by TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS member_team_applications(team_id TEXT NOT NULL REFERENCES member_teams(id),league_id TEXT NOT NULL REFERENCES member_team_leagues(id),ea_club_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')),revision INTEGER NOT NULL DEFAULT 1,last_write TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(team_id,league_id))`,
 `CREATE UNIQUE INDEX IF NOT EXISTS member_application_club ON member_team_applications(league_id,ea_club_id) WHERE status IN ('pending','approved')`,
 `CREATE TABLE IF NOT EXISTS member_team_hubs(team_id TEXT PRIMARY KEY REFERENCES member_teams(id),payload TEXT NOT NULL DEFAULT '{"version":1,"boards":[]}',revision INTEGER NOT NULL DEFAULT 0,created_by TEXT NOT NULL,updated_by TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
 `CREATE TABLE IF NOT EXISTS member_team_audit(id TEXT PRIMARY KEY,team_id TEXT,actor TEXT NOT NULL,action TEXT NOT NULL,before_json TEXT,after_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
];
const staff=actor=>['owner','admin'].includes(actor?.role);
const clean=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>80||/[\u0000-\u001f\u007f]/.test(value))throw Error('Enter a team name between 1 and 80 characters.');return value.trim();};
async function registrationSources(env){
 if(!env.LEAGUE_SUITE_DB)return [];
 const rows=(await env.LEAGUE_SUITE_DB.prepare("SELECT id,json_extract(draft_json,'$.settings') AS settings_json FROM preview_league_results").all()).results.map(r=>({id:r.id,settings:JSON.parse(r.settings_json),available:true}));
 let boards=[];try{boards=(await env.LEAGUE_SUITE_DB.prepare('SELECT id,settings,is_open,expires FROM preview_registration_boards').all()).results;}catch(error){if(!/no such table: preview_registration_boards/.test(String(error)))throw error;}
 return rows.concat(boards.map(b=>({id:'board:'+b.id,settings:JSON.parse(b.settings),available:!!b.is_open&&b.expires>Date.now()}))).filter(s=>s.settings.competitionKind!=='international');
}
const sourceOpen=(league,source)=>!!league.is_open&&!!source?.available&&registrationAllowed({settings:source.settings,registrationOpen:true});
const audit=(db,actor,action,teamId,before,after,where='1',args=[])=>db.prepare(`INSERT INTO member_team_audit(id,team_id,actor,action,before_json,after_json) SELECT ?,?,?,?,?,? WHERE ${where}`).bind(randomToken(18),teamId,actor.discord_id,action,before?JSON.stringify(before):null,JSON.stringify(after),...args);

// Both future bot commands and website flows must use these same durable team IDs.
// A team manager is a team-scoped relationship, never a global account role.
export async function teamRegistrationApi(request,env,{session=getSession,search=searchEaClubs,verify=verifyEaClub}={}){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 const actor=await session(request,env);if(!actor)return json({error:'Sign in with Discord to create or manage a team.'},401);
 if(!env.DB)return json({error:'Team storage is unavailable.'},503);
 const db=env.DB,isStaff=staff(actor),url=new URL(request.url);
 try{
  await db.batch(TEAM_REGISTRATION_SCHEMA.map(sql=>db.prepare(sql)));
  if(request.method==='GET'&&url.searchParams.has('search')){
   const limit=await consumeRateLimit(env,{scope:'member-team-search',subject:actor.discord_id,limit:20});if(!limit.success)return json({error:'Please wait before searching again.'},429);
   return json(await search(url.searchParams.get('search')));
  }
  if(request.method==='GET'){
   const teams=(await db.prepare('SELECT t.*,u.display_name AS manager_name FROM member_teams t JOIN users u ON u.discord_id=t.manager_id WHERE ?=1 OR t.manager_id=? ORDER BY t.created_at,t.id').bind(isStaff?1:0,actor.discord_id).all()).results;
   const applications=(await db.prepare('SELECT a.*,l.name AS league_name,l.season,l.format FROM member_team_applications a JOIN member_teams t ON t.id=a.team_id JOIN member_team_leagues l ON l.id=a.league_id WHERE ?=1 OR t.manager_id=?').bind(isStaff?1:0,actor.discord_id).all()).results;
   const configured=await registrationSources(env);
   const leagues=(await db.prepare('SELECT * FROM member_team_leagues WHERE is_open=1 OR ?=1').bind(isStaff?1:0).all()).results.map(l=>({id:l.id,name:l.name,season:l.season,format:l.format,open:sourceOpen(l,configured.find(s=>s.id===l.id)),enabled:!!l.is_open}));
   const users=isStaff?(await db.prepare("SELECT discord_id AS id,display_name AS name,username FROM users WHERE status='active' ORDER BY display_name COLLATE NOCASE").all()).results:[];
   const sources=isStaff?configured.map(r=>({id:r.id,name:r.settings.league,season:r.settings.season,format:r.settings.format})):[];
   return json({accountId:actor.discord_id,staff:isStaff,teams:teams.map(t=>({...t,hubUrl:applications.some(a=>a.team_id===t.id&&a.status==='approved')?'/team-hub?team='+encodeURIComponent('member:'+t.id):null})),applications,leagues,users,sources});
  }
  const rate=await consumeRateLimit(env,{scope:'member-team-write',subject:actor.discord_id,limit:isStaff?60:20});if(!rate.success)return json({error:'Please wait before making more team changes.'},429);
  const raw=await request.text();if(raw.length>8192)return json({error:'Request too large.'},413);let input;try{input=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
  if(!input||input.accountId!==actor.discord_id)return json({error:'Your signed-in account changed. Reload before saving.'},409);
  if(input.action==='league'){
   if(!isStaff)return json({error:'Only owner/admin can open league registration.'},403);
   if(typeof input.open!=='boolean'||!env.LEAGUE_SUITE_DB)throw Error('Choose a saved league and registration state.');
   const source=(await registrationSources(env)).find(s=>s.id===input.leagueId);if(!source)throw Error('Connect registration from this league’s Teams section in League Suite first.');
   const settings=source.settings;
   const before=await db.prepare('SELECT * FROM member_team_leagues WHERE id=?').bind(input.leagueId).first(),after={id:input.leagueId,name:settings.league,season:settings.season,format:settings.format,open:input.open};
   const registrationSettings=JSON.stringify({windows:settings.windows||[],startDate:settings.startDate,timeZone:settings.timeZone});
   await db.batch([db.prepare('INSERT INTO member_team_leagues(id,name,season,format,is_open,registration_settings,updated_by) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,season=excluded.season,format=excluded.format,is_open=excluded.is_open,registration_settings=excluded.registration_settings,updated_by=excluded.updated_by').bind(input.leagueId,settings.league,settings.season,settings.format,input.open?1:0,registrationSettings,actor.discord_id),audit(db,actor,'league-registration',null,before,after)]);
   return json({saved:true});
  }
  if(input.action==='create'){
   const name=clean(input.name),managerId=input.managerId||actor.discord_id;if(!isStaff&&managerId!==actor.discord_id)return json({error:'You may only create your own team.'},403);
   const manager=await db.prepare("SELECT discord_id,display_name FROM users WHERE discord_id=? AND status='active'").bind(managerId).first();if(!manager)throw Error('Choose an active member who has signed in.');
   const club=input.club?await verify(input.club):null,id=randomToken(18),after={id,name,managerId,club};
   const results=await db.batch([db.prepare('INSERT INTO member_teams(id,name,name_key,manager_id,created_by,ea_club_id,ea_club_name,ea_verified_at) SELECT ?,?,?,?,?,?,?,? WHERE ?=1 OR (SELECT COUNT(*) FROM member_teams WHERE created_by=?)<5').bind(id,name,name.normalize('NFKC').toLowerCase(),managerId,actor.discord_id,club?.id||null,club?.name||null,club?.verifiedAt||null,isStaff?1:0,actor.discord_id),audit(db,actor,'create-team',id,null,after,'EXISTS(SELECT 1 FROM member_teams WHERE id=?)',[id])]);
   if(!results[0].meta.changes)return json({error:'You have reached the five-team creation limit. Contact league staff.'},409);return json({saved:true,teamId:id});
  }
  const team=await db.prepare('SELECT * FROM member_teams WHERE id=?').bind(String(input.teamId||'')).first();if(!team||!isStaff&&team.manager_id!==actor.discord_id)return json({error:'Only this team’s manager or owner/admin can change it.'},403);
  if(!Number.isSafeInteger(input.revision)||team.revision!==input.revision)return json({error:'This team changed. Refresh before saving.'},409);
  const teamGuard='EXISTS(SELECT 1 FROM member_teams WHERE id=? AND revision=? AND (manager_id=? OR ?=1))',guardArgs=[team.id,team.revision,actor.discord_id,isStaff?1:0];
  if(['rename','handoff','link-club'].includes(input.action)){
   let sql,args,after;
   if(input.action==='rename'){const name=clean(input.name);sql='name=?,name_key=?';args=[name,name.normalize('NFKC').toLowerCase()];after={name};}
   if(input.action==='handoff'){
    if(!isStaff)return json({error:'Only owner/admin can assign or replace a team manager.'},403);
    const manager=await db.prepare("SELECT discord_id FROM users WHERE discord_id=? AND status='active'").bind(String(input.managerId||'')).first();if(!manager)throw Error('Choose an active member who has signed in.');
    sql='manager_id=?';args=[manager.discord_id];after={managerId:manager.discord_id};
   }
   if(input.action==='link-club'){
    const live=await db.prepare("SELECT 1 AS found FROM member_team_applications WHERE team_id=? AND status IN ('pending','approved')").bind(team.id).first();if(live)return json({error:'Withdraw pending applications or ask staff to review accepted entries before changing the EA club.'},409);
    const club=await verify(input.club);sql='ea_club_id=?,ea_club_name=?,ea_verified_at=?';args=[club.id,club.name,club.verifiedAt];after={club};
   }
   const extra=input.action==='link-club'?" AND NOT EXISTS(SELECT 1 FROM member_team_applications WHERE team_id=member_teams.id AND status IN ('pending','approved'))":'';
   const write=randomToken(18),results=await db.batch([db.prepare(`UPDATE member_teams SET ${sql},revision=revision+1,last_write=? WHERE id=? AND revision=? AND (manager_id=? OR ?=1)${extra}`).bind(...args,write,...guardArgs),audit(db,actor,input.action,team.id,team,after,'EXISTS(SELECT 1 FROM member_teams WHERE id=? AND last_write=?)',[team.id,write])]);
   if(!results[0].meta.changes)return json({error:'The team or its applications changed. Refresh before saving.'},409);return json({saved:true});
  }
  const league=await db.prepare('SELECT * FROM member_team_leagues WHERE id=?').bind(String(input.leagueId||'')).first();if(!league)throw Error('Choose an available league.');
  if(input.action==='apply'){
   if(!sourceOpen(league,(await registrationSources(env)).find(s=>s.id===league.id)))return json({error:'This league is not accepting team applications.'},409);if(!team.ea_club_id)throw Error('Link the correct EA club before applying.');
   const previous=await db.prepare('SELECT * FROM member_team_applications WHERE team_id=? AND league_id=?').bind(team.id,league.id).first();if(previous&&['pending','approved'].includes(previous.status))return json({error:'This team already has an application in this league.'},409);
   const write=randomToken(18),results=await db.batch([db.prepare(`INSERT INTO member_team_applications(team_id,league_id,ea_club_id,last_write) SELECT ?,?,?,? WHERE ${teamGuard} AND EXISTS(SELECT 1 FROM member_team_leagues WHERE id=? AND is_open=1 AND registration_settings=?) ON CONFLICT(team_id,league_id) DO UPDATE SET status='pending',ea_club_id=excluded.ea_club_id,last_write=excluded.last_write,revision=member_team_applications.revision+1 WHERE member_team_applications.status IN ('rejected','withdrawn')`).bind(team.id,league.id,team.ea_club_id,write,...guardArgs,league.id,league.registration_settings),audit(db,actor,'apply',team.id,previous,{leagueId:league.id,status:'pending'},'EXISTS(SELECT 1 FROM member_team_applications WHERE team_id=? AND league_id=? AND last_write=?)',[team.id,league.id,write])]);
   if(!results[0].meta.changes)return json({error:'The team or registration changed. Refresh before applying.'},409);return json({saved:true});
  }
  if(input.action==='review'||input.action==='withdraw'){
   if(input.action==='review'&&!isStaff)return json({error:'Only owner/admin can approve or reject a team.'},403);
   const status=input.action==='withdraw'?'withdrawn':input.status;if(!['approved','rejected','withdrawn'].includes(status))throw Error('Choose approve or reject.');
   const application=await db.prepare('SELECT * FROM member_team_applications WHERE team_id=? AND league_id=?').bind(team.id,league.id).first();
   if(!application||application.status!=='pending'||application.revision!==input.applicationRevision)return json({error:'This application changed. Refresh before reviewing.'},409);
   const write=randomToken(18),results=await db.batch([db.prepare(`UPDATE member_team_applications SET status=?,revision=revision+1,last_write=? WHERE team_id=? AND league_id=? AND revision=? AND status='pending' AND ${teamGuard}`).bind(status,write,team.id,league.id,application.revision,...guardArgs),db.prepare("INSERT OR IGNORE INTO member_team_hubs(team_id,created_by) SELECT team_id,? FROM member_team_applications WHERE team_id=? AND league_id=? AND last_write=? AND status='approved'").bind(actor.discord_id,team.id,league.id,write),audit(db,actor,'application-'+status,team.id,application,{leagueId:league.id,status},'EXISTS(SELECT 1 FROM member_team_applications WHERE team_id=? AND league_id=? AND last_write=?)',[team.id,league.id,write])]);
   if(!results[0].meta.changes)return json({error:'The team or application changed. Refresh before saving.'},409);return json({saved:true});
  }
  return json({error:'Unknown team action.'},400);
 }catch(error){
  if(/UNIQUE constraint/.test(String(error)))return json({error:'That team name or EA club is already registered. Refresh and check existing teams.'},409);
  if(/D1_|SQLITE|no such table|syntax error/i.test(String(error)))return json({error:'Team storage is unavailable. Please try again later.'},503);
  return json({error:error.message||'The team change could not be saved.'},400);
 }
}
