import {buildLeagueSchedule} from '../../league-engine.js';
import {importAutomaticTrial} from '../../league-ea-auto.js';
import {MATCH_TYPES,readMatchType} from './ea-match-feed.js';
import {activeCollectionFixtures,collectionWindow} from '../../league-collection-window.js';
import {stagePendingResults} from '../../league-pending-results.js';
import {VA_TEST_SOURCES,fetchVaSchedule,importVaSchedule} from '../../league-va-schedule.js';
export async function collectLeagues(env,{now=Date.now(),readFeed=readMatchType,readCalendar=fetchVaSchedule}={}){
 const rows=await env.DB.prepare('SELECT * FROM preview_league_results WHERE enabled=1').all();
 for(const row of rows.results){let saved=JSON.parse(row.draft_json),draft={...buildLeagueSchedule(saved.settings),acceptedResults:saved.acceptedResults||[],pendingResults:saved.pendingResults||[]};const games=[],notes=[];
  try{
   let calendarWarning=null;
   const calendarChecked=Date.parse(saved.settings.vaSchedule?.checkedAt||'');
   if(saved.settings.vaSchedule&&(!Number.isFinite(calendarChecked)||now-calendarChecked>=6*3600000)){
    try{draft=importVaSchedule(draft,await readCalendar(VA_TEST_SOURCES[saved.settings.trialSchedule]),{now});saved={...saved,settings:draft.settings};}
    catch(error){calendarWarning=`Calendar refresh failed; using saved fixtures: ${error.message}`;}
   }
   const due=activeCollectionFixtures(draft,now);
   const ids=[...new Set(due.flatMap(f=>[f.home.eaClubId,f.away.eaClubId]).filter(Boolean))],offset=ids.length?(Math.floor(now/300000)*6)%ids.length:0,batchIds=[...ids.slice(offset),...ids.slice(0,offset)].slice(0,6);
   for(const id of batchIds){const feeds=await Promise.all(MATCH_TYPES.map(([type,ea])=>readFeed(id,type,ea)));for(const feed of feeds){games.push(...feed.matches);if(!feed.available)notes.push(`${id} ${feed.type}: ${feed.attempts.join('; ')}`);}}
   const feedIssues=notes.length;
   const matching=games.filter(g=>draft.fixtures.some(f=>Object.keys(g.clubs||{}).includes(String(f.home.eaClubId))&&Object.keys(g.clubs||{}).includes(String(f.away.eaClubId))));
   const unique=[...new Map(matching.map(g=>[String(g.matchId),g])).values()];if(unique.length)await env.DB.batch(unique.map(game=>env.DB.prepare('INSERT OR IGNORE INTO preview_ea_match_archive(league_id,match_id,game_json) VALUES(?,?,?)').bind(row.id,String(game.matchId),JSON.stringify(game))));
   const archived=await env.DB.prepare('SELECT game_json FROM preview_ea_match_archive WHERE league_id=?').bind(row.id).all();
   const archivedGames=archived.results.map(r=>JSON.parse(r.game_json)),result=importAutomaticTrial(draft,archivedGames);notes.push(...result.warnings);
   const staged=stagePendingResults({...result.draft,pendingResults:saved.pendingResults||[]},archivedGames,now),updated={...saved,acceptedResults:staged.acceptedResults,pendingResults:staged.pendingResults};
   if(calendarWarning)notes.push(calendarWarning);
   const upcoming=draft.fixtures.find(f=>collectionWindow(draft,f).to>=now);
   const previous=row.health?JSON.parse(row.health):{},health={warnings:notes,added:result.added,updated:result.updated,pending:staged.pendingResults.length,polling:due.length>0,clubsChecked:batchIds.length,window:due.length?collectionWindow(draft,due[0]):null,nextWindow:upcoming?collectionWindow(draft,upcoming):null,fixtureCount:draft.fixtures.length,calendarCheckedAt:draft.settings.vaSchedule?.checkedAt||null,intervalMinutes:5,lastEAcheck:batchIds.length?new Date(now).toISOString():previous.lastEAcheck||null};
   await env.DB.prepare("UPDATE preview_league_results SET draft_json=?,revision=revision+1,checked_at=CURRENT_TIMESTAMP,succeeded_at=CASE WHEN ?=0 THEN CURRENT_TIMESTAMP ELSE succeeded_at END,health=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?").bind(JSON.stringify(updated),feedIssues,JSON.stringify(health),row.id,row.revision).run();
  }catch(error){await env.DB.prepare('UPDATE preview_league_results SET checked_at=CURRENT_TIMESTAMP,health=? WHERE id=? AND revision=?').bind(JSON.stringify({error:String(error.message)}),row.id,row.revision).run();}
 }
}
