import {getSession,json,sameOrigin} from './auth.js';
import {buildLeagueSchedule} from '../../league-engine.js';
import {restoreAcceptedResults} from '../../league-results.js';
import {correctFixture} from '../../league-result-corrections.js';
import {acceptPendingResult} from '../../league-pending-results.js';
const publicDraft=draft=>({pendingResults:draft.pendingResults||[],acceptedResults:draft.acceptedResults||[],settings:Object.fromEntries(['trialSchedule','serverLeagueId','season','league','format','size','maxTeamSize','keepersEnabled','startDate','weekday','secondWeekday','time','timeZone','spacingMinutes','repeatWeeks','matchnightCount','byePolicy','byePolicyRevision','collectionEnabled','scoringMode'].filter(k=>draft.settings[k]!==undefined).map(k=>[k,draft.settings[k]]).concat([['teams',draft.settings.teams.map(t=>({id:t.id,name:t.name,eaClubId:t.eaClubId}))]]))});
export async function previewLeagueResultsApi(request,env){
 try{
  if(request.method==='GET'){const rows=await env.DB.prepare('SELECT id,draft_json,revision,enabled,checked_at,succeeded_at,health FROM preview_league_results ORDER BY id').all();return json({leagues:rows.results.map(r=>({...r,draft:publicDraft(JSON.parse(r.draft_json)),draft_json:undefined,health:r.health?JSON.parse(r.health):null}))});}
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(!sameOrigin(request))return json({error:'Same-origin request required.'},403);
  const actor=await getSession(request,env);if(!actor||!['owner','admin'].includes(actor.role))return json({error:'Sign in as a preview owner/admin to change shared results. Local draft editing remains available.'},403);
  const text=await request.text();if(text.length>1000000)return json({error:'Result payload too large.'},413);const payload=JSON.parse(text),id=String(payload.id||'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Invalid league ID.');
  const row=await env.DB.prepare('SELECT * FROM preview_league_results WHERE id=?').bind(id).first();
  if(payload.operation==='register'){
   if(row)return json({error:'This league already exists online. Open its shared results rather than replace them.'},409);
   const settings={...payload.draft.settings,collectionEnabled:true},draft=restoreAcceptedResults(buildLeagueSchedule(settings),payload.draft.acceptedResults||[]);
   await env.DB.prepare('INSERT INTO preview_league_results(id,draft_json) VALUES(?,?)').bind(id,JSON.stringify({settings:draft.settings,acceptedResults:draft.acceptedResults})).run();return json({saved:true});
  }
  if(!row)throw Error('Register this league for shared tracking first.');if(payload.revision!==row.revision)return json({error:'Results changed online. Refresh and review before saving again.'},409);
  const saved=JSON.parse(row.draft_json),draft={...buildLeagueSchedule(saved.settings),acceptedResults:saved.acceptedResults||[],pendingResults:saved.pendingResults||[]};
  const corrected=payload.operation==='accept-pending'?acceptPendingResult(draft,payload.fixtureId,payload.matchId,payload.values,{actor:actor.discord_id}):correctFixture(draft,payload.fixtureId,payload.values,{actor:actor.discord_id});
  const result=corrected.acceptedResults.find(r=>r.fixtureId===payload.fixtureId),before=draft.acceptedResults.find(r=>r.fixtureId===payload.fixtureId)||null;
  const changes=await env.DB.batch([
   env.DB.prepare('INSERT INTO preview_result_audit(league_id,fixture_id,actor,reason,before_json,after_json) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM preview_league_results WHERE id=? AND revision=?)').bind(id,payload.fixtureId,actor.discord_id,result.correction.reason,JSON.stringify(before),JSON.stringify(result),id,row.revision),
   env.DB.prepare('UPDATE preview_league_results SET draft_json=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?').bind(JSON.stringify({...saved,acceptedResults:corrected.acceptedResults,pendingResults:(corrected.pendingResults||draft.pendingResults).filter(p=>p.fixtureId!==payload.fixtureId)}),id,row.revision)
  ]);if(!changes[1].meta.changes)return json({error:'Concurrent update. Refresh before saving.'},409);return json({saved:true,revision:row.revision+1});
 }catch(error){return json({error:error.message||'Could not process league results.'},400);}
}
