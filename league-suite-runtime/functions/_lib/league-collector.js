import {buildLeagueSchedule} from '../../league-engine.js';
import {importAutomaticTrial} from '../../league-ea-auto.js';
import {MATCH_TYPES} from './ea-match-feed.js';
import {readCollectedMatchType} from './ea-hosted-feed.js';
import {collectionWindow} from '../../league-collection-window.js';
import {collectionPlan} from '../../league-collection-policy.js';
import {stagePendingResults} from '../../league-pending-results.js';
import {VA_TEST_SOURCES,fetchVaSchedule,importVaSchedule} from '../../league-va-schedule.js';
import {archiveMatches} from './ea-match-archive.js';
export async function collectLeagues(env,{now=Date.now(),readFeed,readCalendar=fetchVaSchedule}={}){
 const pullFeed=readFeed||((id,type,eaType)=>readCollectedMatchType(env,id,type,eaType,{now}));
 const rows=await env.DB.prepare('SELECT * FROM preview_league_results WHERE enabled=1').all();
 for(const row of rows.results){const checkedAt=new Date(now).toISOString(),runId=crypto.randomUUID();let previous={},mode='idle',feeds=[];
  try{
   previous=row.health?JSON.parse(row.health):{};
   let saved=JSON.parse(row.draft_json);if(env.LEAGUE_FORMAT&&saved.settings.format!==env.LEAGUE_FORMAT)continue;
   let draft={...buildLeagueSchedule(saved.settings),acceptedResults:saved.acceptedResults||[],pendingResults:saved.pendingResults||[]};const games=[],notes=[];
   let calendarWarning=null;
   const calendarChecked=Date.parse(saved.settings.vaSchedule?.checkedAt||'');
   if(saved.settings.vaSchedule&&(!Number.isFinite(calendarChecked)||now-calendarChecked>=6*3600000)){
    try{draft=importVaSchedule(draft,await readCalendar(VA_TEST_SOURCES[saved.settings.trialSchedule]),{now});saved={...saved,settings:draft.settings};}
    catch(error){calendarWarning=`Calendar refresh failed; using saved fixtures: ${error.message}`;}
   }
   const plan=collectionPlan(draft,previous,now),due=plan.fixtures;mode=plan.mode;
   const ids=[...new Set(due.flatMap(f=>[f.home.eaClubId,f.away.eaClubId]).filter(Boolean))],size=mode==='catchup'?10:6,offset=ids.length?(Math.floor(now/300000)*size)%ids.length:0,batchIds=[...ids.slice(offset),...ids.slice(0,offset)].slice(0,size);
   for(const id of batchIds){const fetched=await Promise.all(MATCH_TYPES.map(([type,ea])=>pullFeed(id,type,ea)));for(const feed of fetched){games.push(...feed.matches);feeds.push({clubId:String(id),type:feed.type,available:feed.available,source:feed.source||null,matches:feed.matches.length,attempts:feed.attempts||[],fetchedAt:feed.fetchedAt||checkedAt});if(!feed.available)notes.push(`${id} ${feed.type}: ${feed.attempts.join('; ')}`);}}
   const failures=feeds.filter(f=>f.type==='friendly'&&!f.available),successful=batchIds.length>0&&!failures.length;
   const matching=games.filter(g=>draft.fixtures.some(f=>Object.keys(g.clubs||{}).includes(String(f.home.eaClubId))&&Object.keys(g.clubs||{}).includes(String(f.away.eaClubId))));
   const uniqueIds=new Set(matching.map(g=>String(g.matchId??g.id)));
   const archivedGames=await archiveMatches(env.DB,row.id,matching,{now:checkedAt}),result=importAutomaticTrial(draft,archivedGames,now);notes.push(...result.warnings);
   const staged=stagePendingResults({...result.draft,pendingResults:saved.pendingResults||[]},archivedGames,now),updated={...saved,acceptedResults:staged.acceptedResults,pendingResults:staged.pendingResults};
   if(calendarWarning)notes.push(calendarWarning);
   const upcoming=draft.fixtures.find(f=>collectionWindow(draft,f).to>=now);
   const upstreamStatus=batchIds.length?(successful?'healthy':'failed'):(previous.upstreamStatus||'not-tested');
   if(!batchIds.length&&upstreamStatus==='failed')notes.push('Last friendly feed check failed; idle scheduler ticks do not clear this failure.');
   const health={warnings:notes,added:result.added,updated:result.updated,pending:staged.pendingResults.length,polling:mode==='live',mode,clubsChecked:batchIds.length,window:mode==='live'?collectionWindow(draft,due[0]):null,nextWindow:upcoming?collectionWindow(draft,upcoming):null,fixtureCount:draft.fixtures.length,calendarCheckedAt:draft.settings.vaSchedule?.checkedAt||null,intervalMinutes:5,lastEAcheck:batchIds.length?checkedAt:previous.lastEAcheck||null,
    lastEAsuccess:successful?feeds.filter(f=>f.type==='friendly').map(f=>f.fetchedAt).sort()[0]||checkedAt:previous.lastEAsuccess||null,upstreamStatus,lastFeedFailure:failures.length?{at:checkedAt,feeds:failures}:previous.lastFeedFailure||null,lastFeedDiagnostics:feeds.length?feeds:previous.lastFeedDiagnostics||[],lastCatchupCheck:mode==='catchup'?checkedAt:previous.lastCatchupCheck||null,catchupIntervalMinutes:30,catchupDays:7,unresolvedFixtures:plan.missingCount,runId};
   const status=failures.length?'feed-failure':mode==='idle'?'idle':staged.pendingResults.length?'needs-review':'success';
   await env.DB.prepare('INSERT INTO preview_collection_runs(id,league_id,checked_at,mode,status,diagnostics_json) VALUES(?,?,?,?,?,?)').bind(runId,row.id,checkedAt,mode,status,JSON.stringify({feeds,received:games.length,matching:uniqueIds.size,added:result.added,updated:result.updated,pending:staged.pendingResults.length,warnings:notes})).run();
   const changed=await env.DB.prepare("UPDATE preview_league_results SET draft_json=?,revision=revision+1,checked_at=CURRENT_TIMESTAMP,succeeded_at=CASE WHEN ?=1 THEN CURRENT_TIMESTAMP ELSE succeeded_at END,health=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?").bind(JSON.stringify(updated),successful?1:0,JSON.stringify(health),row.id,row.revision).run();
   if(!changed.meta.changes)await env.DB.prepare("UPDATE preview_collection_runs SET status='revision-conflict' WHERE id=?").bind(runId).run();
  }catch(error){const health={...previous,error:String(error.message),mode,runId,upstreamStatus:'failed'};console.error(JSON.stringify({event:'league_collection_failed',leagueId:row.id,runId,error:health.error}));await env.DB.prepare('INSERT OR IGNORE INTO preview_collection_runs(id,league_id,checked_at,mode,status,diagnostics_json) VALUES(?,?,?,?,?,?)').bind(runId,row.id,checkedAt,mode,'error',JSON.stringify({error:health.error,feeds})).run();await env.DB.prepare('UPDATE preview_league_results SET checked_at=CURRENT_TIMESTAMP,health=? WHERE id=? AND revision=?').bind(JSON.stringify(health),row.id,row.revision).run();}
 }
}
