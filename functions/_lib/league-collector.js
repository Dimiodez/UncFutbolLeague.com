import {buildLeagueSchedule} from '../../league-engine.js';
import {importAutomaticTrial} from '../../league-ea-auto.js';
import {MATCH_TYPES,readMatchType} from './ea-match-feed.js';
export async function collectLeagues(env){
 const rows=await env.DB.prepare('SELECT * FROM preview_league_results WHERE enabled=1').all();
 for(const row of rows.results){const saved=JSON.parse(row.draft_json),draft={...buildLeagueSchedule(saved.settings),acceptedResults:saved.acceptedResults||[]},games=[],notes=[];const now=Date.now();
  const due=draft.fixtures.filter(f=>f.startsAt<=now&&f.startsAt>=now-7*86400000&&!(draft.acceptedResults||[]).some(r=>r.fixtureId===f.id));
  try{
   const ids=[...new Set(due.flatMap(f=>[f.home.eaClubId,f.away.eaClubId]).filter(Boolean))],offset=ids.length?Math.floor(now/300000)%ids.length:0,batchIds=[...ids.slice(offset),...ids.slice(0,offset)].slice(0,6);
   for(const id of batchIds){const feeds=await Promise.all(MATCH_TYPES.map(([type,ea])=>readMatchType(id,type,ea)));for(const feed of feeds){games.push(...feed.matches);if(!feed.available)notes.push(`${id} ${feed.type}: ${feed.attempts.join('; ')}`);}}
   const matching=games.filter(g=>draft.fixtures.some(f=>Object.keys(g.clubs||{}).includes(String(f.home.eaClubId))&&Object.keys(g.clubs||{}).includes(String(f.away.eaClubId))));
   const unique=[...new Map(matching.map(g=>[String(g.matchId),g])).values()];if(unique.length)await env.DB.batch(unique.map(game=>env.DB.prepare('INSERT OR IGNORE INTO preview_ea_match_archive(league_id,match_id,game_json) VALUES(?,?,?)').bind(row.id,String(game.matchId),JSON.stringify(game))));
   const archived=await env.DB.prepare('SELECT game_json FROM preview_ea_match_archive WHERE league_id=?').bind(row.id).all();
   const result=importAutomaticTrial(draft,archived.results.map(r=>JSON.parse(r.game_json)));notes.push(...result.warnings);
   const updated={...saved,acceptedResults:result.draft.acceptedResults};
   await env.DB.prepare("UPDATE preview_league_results SET draft_json=?,revision=revision+1,checked_at=CURRENT_TIMESTAMP,succeeded_at=CASE WHEN ?=0 THEN CURRENT_TIMESTAMP ELSE succeeded_at END,health=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?").bind(JSON.stringify(updated),notes.length,JSON.stringify({warnings:notes,added:result.added,updated:result.updated}),row.id,row.revision).run();
  }catch(error){await env.DB.prepare('UPDATE preview_league_results SET checked_at=CURRENT_TIMESTAMP,health=? WHERE id=? AND revision=?').bind(JSON.stringify({error:String(error.message)}),row.id,row.revision).run();}
 }
}
