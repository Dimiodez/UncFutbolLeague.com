import {buildLeagueSchedule} from '../../league-suite-runtime/league-engine.js';
import {leagueStandings,acceptedAppearances,standardTrial} from '../../league-suite-runtime/league-results.js';
import {playerTotals,numeric} from '../../league-suite-runtime/league-player-stats.js';

// Read-only projection of saved, accepted records. Live provider feeds, local
// drafts and unaccepted EA candidates never supply data directly to this view.
const teamView=team=>({id:team.id,name:team.name});
const stamp=value=>value?new Date(/Z$|[+]\d\d:\d\d$/.test(value)?value:value.replace(' ','T')+'Z').toISOString():null;
const fields=['goals','assists','shots','passes','passesCompleted','tackles','tacklesWon','manOfTheMatch'];
const sourceOf=result=>result.provenance?.kind==='va-match-report'?'va-report':result.provenance?.kind==='va-score-only'?'va-score':result.correction?(result.eaOriginal?'reviewed-ea':'manual'):'ea';
const appearanceView=p=>({name:p.name,playerId:p.playerId,teamId:p.teamId,position:p.position||'UNK',rating:numeric(p.rating),goals:numeric(p.goals),assists:numeric(p.assists),details:Object.fromEntries(fields.filter(k=>!['goals','assists'].includes(k)).map(k=>[k,numeric(p.details?.[k])]))});

export function projectLeague(row,{now=Date.now()}={}){
 const saved=typeof row.draft_json==='string'?JSON.parse(row.draft_json):row.draft;
 const draft={...buildLeagueSchedule(saved.settings),acceptedResults:saved.acceptedResults||[]};
 const results=new Map(draft.acceptedResults.map(r=>[r.fixtureId,r]));
 if(results.size!==draft.acceptedResults.length)throw Error('Duplicate accepted fixtures.');
 for(const result of results.values())if(!draft.fixtures.some(f=>f.id===result.fixtureId)||![result.homeScore,result.awayScore].every(v=>Number.isInteger(v)&&v>=0))throw Error('Invalid saved match result.');
 const pending=new Set((saved.pendingResults||[]).map(r=>r.fixtureId));
 const form=new Map(draft.settings.teams.map(t=>[t.id,[]]));
 const sourceCounts={ea:0,'reviewed-ea':0,manual:0,'va-score':0,'va-report':0};
 const fixtures=draft.fixtures.map(f=>{
  const r=results.get(f.id),status=r?'played':pending.has(f.id)?'review':f.startsAt<now?'awaiting':'scheduled';
  if(r){sourceCounts[sourceOf(r)]++;for(const [team,own,other] of [[f.home,r.homeScore,r.awayScore],[f.away,r.awayScore,r.homeScore]])form.get(team.id).push({fixtureId:f.id,result:own>other?'W':own===other?'D':'L'});}
  return {id:f.id,round:f.round,week:f.week,date:f.date,startsAt:f.startsAt,home:teamView(f.home),away:teamView(f.away),status,
   ...(r?{homeScore:r.homeScore,awayScore:r.awayScore,source:sourceOf(r),statsStatus:r.provenance?.kind==='va-score-only'?'unavailable':r.correction?.statsReview?'needs-review':r.appearances?.length?'available':'unavailable',appearances:(r.appearances||[]).map(appearanceView)}:{})};
 });
 const standings=leagueStandings(draft).map((t,i)=>({...teamView(t),rank:i+1,played:t.played,wins:t.wins,draws:t.draws??0,losses:t.regularLosses+t.extraLosses,goalsFor:t.goalsFor,goalsAgainst:t.goalsAgainst,goalDifference:t.goalsFor-t.goalsAgainst,points:t.points,form:form.get(t.id).slice(-5).map(f=>f.result)}));
 const records=acceptedAppearances(draft),players=playerTotals(records).map(p=>({playerId:p.playerId,name:p.name,teamId:p.teamId,teamName:draft.settings.teams.find(t=>t.id===p.teamId)?.name||p.teamName,position:p.position,apps:p.apps,rating:p.averageRating,ratingCount:p.ratingCount,passAccuracy:p.passAccuracy,tackleAccuracy:p.tackleAccuracy,...Object.fromEntries(fields.map(k=>[k,p.known[k]?p.totals[k]:null]))}));
 return {id:row.id,revision:row.revision,name:draft.settings.league,season:draft.settings.season,format:draft.settings.format,timeZone:draft.settings.timeZone,
  scoring:standardTrial(draft)?'3 points for a win · 1 for a draw · 0 for a loss':'Regulation win 3 · Extra-time win 2 · Extra-time loss 1',
  teams:draft.settings.teams.map(teamView),standings,fixtures,players,sourceCounts,
  totals:{played:results.size,fixtures:fixtures.length,pending:fixtures.filter(f=>f.status==='review').length,awaiting:fixtures.filter(f=>f.status==='awaiting').length,appearances:records.length,goals:fixtures.reduce((n,f)=>n+(f.homeScore??0)+(f.awayScore??0),0)},
  history:saved.historyReconciliation?{checkedAt:saved.historyReconciliation.checkedAt,throughRound:saved.historyReconciliation.throughRound,compared:saved.historyReconciliation.compared,matched:saved.historyReconciliation.matched,missing:saved.historyReconciliation.missing?.length||0,differences:(saved.historyReconciliation.differences||[]).map(d=>({date:d.date,home:d.home,away:d.away,recordedScore:d.recordedScore,vaScore:d.vaScore}))}:null,
  collection:{enabled:!!row.enabled,lastCheck:stamp(row.checked_at),lastSuccess:stamp(row.succeeded_at)}};
}

export async function leagueCentreApi(request,env){
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
 if(request.method!=='GET')return new Response(JSON.stringify({error:'Read-only endpoint.'}),{status:405,headers:{...headers,allow:'GET'}});
 try{
  const rows=await env.DB.prepare('SELECT id,draft_json,revision,enabled,checked_at,succeeded_at FROM preview_league_results ORDER BY id').all();
  return new Response(JSON.stringify({generatedAt:new Date().toISOString(),leagues:rows.results.map(row=>projectLeague(row))}),{headers});
 }catch{return new Response(JSON.stringify({error:'The saved league data could not be loaded. Please try again.'}),{status:503,headers});}
}
