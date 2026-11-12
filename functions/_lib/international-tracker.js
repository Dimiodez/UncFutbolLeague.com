import {json,sameOrigin} from './auth.js';
import {consumeRateLimit} from './rate-limit.js';
import {INTERNATIONAL_VA_FIXTURES} from './international-va-fixtures.js';
import {buildLeagueSchedule} from '../../league-suite-runtime/league-engine.js';
import {INTERNATIONAL_TRACKER_ID as ID,INTERNATIONAL_COLLECTOR_RELEASE as RELEASE,INTERNATIONAL_COUNTRIES} from '../../league-suite-runtime/league-international-schedule.js';
export const INTERNATIONAL_WORKER='https://ufl-preview-league-collector.andrew-dimio.workers.dev';
export function internationalTrackerSettings(teams){
 if(teams.length!==10||INTERNATIONAL_COUNTRIES.some(id=>!teams.some(t=>t.id===id)))throw Error('All ten national teams must be configured.');
 const fixtures=INTERNATIONAL_VA_FIXTURES.filter(f=>f.stage==='league'&&f.startsAt>='2026-11-12T00:00:00.000Z').map(f=>({id:f.id,vaMatchId:String(f.sourceMatchId),sourceUrl:f.sourceUrl,startsAt:Date.parse(f.startsAt),round:Number(f.round.match(/\d+/)?.[0]),homeId:f.homeId,awayId:f.awayId,stage:'league'}));
 return {serverLeagueId:ID,competitionKind:'international',season:'Internationals · Season 1 · EA Test',league:'Internationals · Automatic EA tracker',format:'6v6',size:6,maxTeamSize:100,keepersEnabled:false,startDate:'2026-11-12',weekday:4,time:'18:00',timeZone:'America/Chicago',spacingMinutes:30,repeatWeeks:1,matchnightCount:2,secondWeekday:2,byePolicy:'split',byePolicyRevision:2,breaks:[],windows:[],collectionEnabled:true,scoringMode:'standard',pagePublished:false,teams:teams.map(t=>({id:t.id,name:t.name,eaClubId:t.ea_club_id})),internationalSchedule:{version:1,competitionId:'ufl-internationals',testFrom:'2026-11-12',fixtures}};
}
export async function internationalTrackerApi(request,env,{fetcher=fetch}={}){
 const actor=env.SUITE_ACTOR;
 if(!actor||!['owner','admin'].includes(actor.role))return json({error:'Owner/admin access required.'},403);
 if(!env.LEAGUE_SUITE_DB)return json({error:'Shared tracker storage unavailable.'},503);
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!sameOrigin(request))return json({error:'Same-origin request required.'},403);
 const db=env.LEAGUE_SUITE_DB;
 try{
  const row=await db.prepare('SELECT * FROM preview_league_results WHERE id=?').bind(ID).first();
  if(request.method==='GET'){
   let workerReady=false;try{const r=await fetcher(INTERNATIONAL_WORKER,{cache:'no-store',signal:AbortSignal.timeout(8000)});workerReady=r.ok&&(await r.json()).release===RELEASE;}catch{}
   const saved=row?JSON.parse(row.draft_json):null;
   return json({id:ID,prepared:!!row,enabled:!!row?.enabled,revision:row?.revision,workerReady,checkedAt:row?.checked_at||null,succeededAt:row?.succeeded_at||null,health:row?.health?JSON.parse(row.health):null,fixtures:saved?buildLeagueSchedule(saved.settings).fixtures.length:0,accepted:saved?.acceptedResults?.length||0,pending:saved?.pendingResults?.length||0,viewUrl:'/league-suite/view?league='+ID,publicSourceUnchanged:true});
  }
  const limited=await consumeRateLimit(env,{scope:'international-tracker',subject:actor.discord_id,limit:10});if(!limited.success)return json({error:'Please wait before changing tracker settings again.'},429);
  const raw=await request.text();if(raw.length>1024)return json({error:'Request too large.'},413);const payload=JSON.parse(raw);
  if(!['prepare','start','stop'].includes(payload?.action))return json({error:'Choose prepare, start or stop.'},400);
  const teams=(await env.DB.prepare('SELECT id,name,ea_club_id FROM international_teams WHERE competition_id=? ORDER BY name').bind('ufl-internationals').all()).results;
  if(payload.action==='prepare'){
   if(row)return json({error:'Tracker already exists. Its results have not been replaced.'},409);
   const draft=buildLeagueSchedule(internationalTrackerSettings(teams));
   await db.prepare('INSERT INTO preview_league_results(id,draft_json,enabled) VALUES(?,?,0)').bind(ID,JSON.stringify({settings:draft.settings,acceptedResults:[],pendingResults:[],trackerSetup:{actor:actor.discord_id,at:new Date().toISOString(),publicSource:'unchanged'}})).run();
   return json({saved:true,enabled:false,id:ID,fixtures:draft.fixtures.length});
  }
  if(!row||payload.revision!==row.revision)return json({error:'Tracker changed online. Refresh before continuing.'},409);
  if(payload.action==='start'){
   buildLeagueSchedule(internationalTrackerSettings(teams));
   const current=JSON.parse(row.draft_json);if(current.settings.teams.some(t=>!teams.some(n=>n.id===t.id&&n.ea_club_id===t.eaClubId)))return json({error:'National club links changed. Review the tracker before starting.'},409);
   const r=await fetcher(INTERNATIONAL_WORKER,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok||(await r.json()).release!==RELEASE)return json({error:'Deploy the international-ready collector build before enabling this tracker.'},409);
  }
  const result=await db.prepare('UPDATE preview_league_results SET enabled=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?').bind(payload.action==='start'?1:0,ID,row.revision).run();
  if(!result.meta.changes)return json({error:'Tracker changed concurrently. Refresh and try again.'},409);
  return json({saved:true,id:ID,enabled:payload.action==='start',publicSourceUnchanged:true});
 }catch(error){return json({error:error.message||'International tracker could not be configured.'},400);}
}
