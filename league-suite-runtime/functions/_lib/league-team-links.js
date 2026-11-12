import {getSession,json,sameOrigin} from './auth.js';
import {consumeRateLimit} from './rate-limit.js';
import {verifyEaClub} from './ea-club-search.js';
import {buildLeagueSchedule} from '../../league-engine.js';
import {linkDraftTeamClub} from '../../league-team-linking.js';

export async function leagueTeamLinkApi(request,env,{verify=verifyEaClub}={}){
 if(request.method!=='POST')return json({error:'Method not allowed.'},405,{allow:'POST'});
 if(!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 const actor=await getSession(request,env);
 if(!actor||!['owner','admin'].includes(actor.role))return json({error:'Owner or administrator access required.'},403);
 const limited=await consumeRateLimit(env,{scope:'league-team-link',subject:actor.discord_id,limit:15});
 if(!limited.success)return json({error:'Please wait a minute before linking again.'},429,{'retry-after':String(limited.retryAfter)});
 let payload;
 try{const raw=await request.text();if(raw.length>4096)return json({error:'Request too large.'},413);payload=JSON.parse(raw);}catch{return json({error:'Invalid club selection.'},400);}
 const verifyOnly=new URL(request.url).pathname==='/api/ea/verify';
 try{
  let row,saved,draft;
  if(!verifyOnly){
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(payload.leagueId||'')||typeof payload.teamId!=='string'||!Number.isSafeInteger(payload.revision))return json({error:'Choose a saved league and team.'},400);
   row=await env.DB.prepare('SELECT * FROM preview_league_results WHERE id=?').bind(payload.leagueId).first();
   if(!row)return json({error:'Shared league not found. Save this league for shared collection first.'},404);
   if(row.revision!==payload.revision)return json({error:'The league changed online. Refresh before linking.'},409);
   saved=JSON.parse(row.draft_json);draft={...buildLeagueSchedule(saved.settings),acceptedResults:saved.acceptedResults||[],pendingResults:saved.pendingResults||[]};
   // Run local history/duplicate checks before making any upstream request.
   linkDraftTeamClub(draft,payload.teamId,{...payload.club,platform:payload.club?.platform||'common-gen5'});
  }
  const club=await verify(payload.club);
  if(verifyOnly)return json({verified:true,club,note:'Club found on EA. This does not prove ownership or grant team permissions.'});
  const next=linkDraftTeamClub(draft,payload.teamId,club),before=saved.settings.teams.find(t=>t.id===payload.teamId);
  const audit=[...(saved.teamLinkAudit||[]),{teamId:payload.teamId,before:before.eaClubId||null,after:club.id,clubName:club.name,actor:actor.discord_id,at:club.verifiedAt}];
  const result=await env.DB.prepare('UPDATE preview_league_results SET draft_json=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?').bind(JSON.stringify({...saved,settings:next.settings,teamLinkAudit:audit}),payload.leagueId,row.revision).run();
  if(!result.meta.changes)return json({error:'The collector or another administrator updated this league. Refresh and try again; your link was not saved.'},409);
  return json({linked:true,club,teamId:payload.teamId,revision:row.revision+1,note:'Linked to this league team and saved online. Existing results and permissions are unchanged.'});
 }catch(error){return json({error:error.message||'Could not link this club.'},/unavailable/.test(error.message)?502:400);}
}
