import evidence from '../../data/international-baseline-20261112.json' with {type:'json'};
import {INTERNATIONAL_VA_FIXTURES} from './international-va-fixtures.js';
import {buildLeagueSchedule} from '../../league-suite-runtime/league-engine.js';
import {correctFixture} from '../../league-suite-runtime/league-result-corrections.js';
import {clubPlayers,DETAIL_FIELDS,eaPosition} from '../../league-suite-runtime/league-player-stats.js';
import {projectLeague} from './league-centre.js';
export {evidence as INTERNATIONAL_BASELINE_EVIDENCE};
const key=value=>String(value||'').normalize('NFKC').trim().toLowerCase();
const nationByProvider={28:'ITA',29:'FRA',30:'GER',31:'ESP',32:'MEX',33:'ARG',34:'ENG',35:'USA',36:'BRA',37:'CAN'};
const sourceKey=value=>{try{return key(decodeURIComponent(new URL(value).pathname));}catch{return '';}};
const number=value=>{if(value===undefined||value===null||value==='')return null;if(typeof value==='boolean')return Number(value);const n=Number(value);if(!Number.isFinite(n)||n<0)throw Error('Invalid historical player statistic.');return n;};

export function planInternationalBaseline(saved,games,{actor,now=new Date().toISOString(),source=evidence}={}){
 if(saved.internationalBaseline)throw Error('A VA baseline was already imported. Existing results have not been replaced.');
 if(!actor||saved.settings?.internationalSchedule?.competitionId!=='ufl-internationals'||source.competitionId!==4||source.seasonId!==6||source.reports.length!==10)throw Error('Invalid international baseline target or source.');
 buildLeagueSchedule(saved.settings);
 const accepted=new Set((saved.acceptedResults||[]).map(r=>r.fixtureId)),pending=new Set((saved.pendingResults||[]).map(r=>r.fixtureId));
 const fixtures=INTERNATIONAL_VA_FIXTURES.filter(f=>f.stage==='league').map(f=>{
  const prior=saved.settings.internationalSchedule.fixtures.find(p=>p.id===f.id);
  let startsAt=prior?.startsAt??Date.parse(f.startsAt);
  // Owner confirmed November 12 kicks off at 9/9:30 PM Central (UTC-6).
  if(f.startsAt.startsWith('2026-11-13')){
   const corrected=Date.parse(f.startsAt)+3*3600000;
   if(startsAt!==corrected&&(accepted.has(f.id)||pending.has(f.id)))throw Error('Tonight already has recorded evidence. Review it before changing its kickoff.');
   startsAt=corrected;
  }
  return {...prior,id:f.id,vaMatchId:String(f.sourceMatchId),sourceUrl:f.sourceUrl,startsAt,round:Number(f.round.match(/\d+/)?.[0]),homeId:f.homeId,awayId:f.awayId,stage:'league'};
 });
 const settings={...saved.settings,startDate:'2026-11-10',internationalSchedule:{...saved.settings.internationalSchedule,fixtures,baselineIncluded:true,confirmedKickoffs:{...(saved.settings.internationalSchedule.confirmedKickoffs||{}),'2026-11-12':{first:'21:00',second:'21:30',timeZone:'America/Chicago',actor,at:now}}}};
 let draft={...buildLeagueSchedule(settings),acceptedResults:saved.acceptedResults||[],pendingResults:saved.pendingResults||[]};
 const links=new Map(),sourcePeople=new Map(),rawEvidence=[],imported=[];
 for(const report of source.reports){
  const f=draft.fixtures.find(f=>f.id===report.fixtureId),m=report.match;
  if(!f||f.date>='2026-11-12'||f.home.id!==report.homeId||f.away.id!==report.awayId||nationByProvider[m.participant_home_id]!==f.home.id||nationByProvider[m.participant_away_id]!==f.away.id||m.competition_season_id!==6||String(m.id)!==f.vaMatchId||!Number.isFinite(Date.parse(m.posted_at))||Date.parse(m.posted_at)>Date.parse(now)||accepted.has(f.id)||pending.has(f.id))throw Error('Historical fixture conflicts with saved results: '+report.fixtureId);
  const candidates=games.filter(g=>String(g.matchId??g.id)===report.ea.matchId&&g.clubs?.[f.home.eaClubId]&&g.clubs?.[f.away.eaClubId]);
  if(!candidates.length)throw Error('Original EA identity evidence is missing for VA match '+m.id+'. No partial baseline was saved.');
  const game=candidates.sort((a,b)=>Object.keys(b.players||{}).length-Object.keys(a.players||{}).length)[0];
  if(![report.ea.homeClubId,report.ea.awayClubId].includes(f.home.eaClubId)||![report.ea.homeClubId,report.ea.awayClubId].includes(f.away.eaClubId)||String(game.timestamp)!==String(report.ea.timestamp))throw Error('Original EA match identity does not match VA match '+m.id);
  const appearances=[],seen=new Set();
  for(const side of ['home','away']){
   const team=f[side],stats=m['participant_'+side+'_stats'];if(!stats||typeof stats!=='object'||Array.isArray(stats))throw Error('VA player sheet unavailable for match '+m.id);
   for(const [vaId,s] of Object.entries(stats)){
    if(!/^\d+$/.test(vaId))throw Error('Invalid VA player identity.');
    const matches=clubPlayers(game,team.eaClubId).filter(([,p])=>key(p.playername??p.name)===key(s.player_name));
    if(matches.length!==1)throw Error(`Player identity needs review: ${s.player_name} (VA match ${m.id}). No partial baseline was saved.`);
    const [eaId]=matches[0],linkKey=JSON.stringify([team.id,eaId]),registered=Object.values(m['participant_'+side+'_lineup']?.players||{}).find(p=>String(p.id)===vaId),name=registered?.name||s.player_name;
    if(seen.has(eaId)||links.has(linkKey)&&links.get(linkKey).vaUserId!==vaId)throw Error('Conflicting VA/EA player identity.');seen.add(eaId);
    const link={teamId:team.id,eaPlayerId:eaId,vaUserId:vaId,playerId:'va:'+vaId,name,sourceUrl:registered?.url||null};links.set(linkKey,link);
    if(registered?.url)sourcePeople.set(team.id+':'+sourceKey(registered.url),'va:'+vaId);
    const aliases={shots:'shots',passes:'total_passes',passesCompleted:'successful_passes',tackles:'total_tackles',tacklesWon:'successful_tackles',saves:'saves',redCards:'red_card',manOfTheMatch:'motm'};
    const rating=number(s.match_rating);if(rating!==null&&rating>10)throw Error('Invalid VA match rating.');
    appearances.push({playerId:eaId,name,teamId:team.id,position:eaPosition(s.position),rating,goals:number(s.goals),assists:number(s.assists),details:Object.fromEntries(DETAIL_FIELDS.map(k=>[k,aliases[k]?number(s[aliases[k]]):null])),vaReport:{userId:vaId,registeredName:name,eaName:s.player_name,sourceUrl:registered?.url||null,defenderCleansheet:s.defender_cleansheet??null,goalkeeperCleansheet:s.goalkeeper_cleansheet??null,dnf:s.dnf??null}});
   }
  }
  if(!appearances.length)throw Error('Historical player sheet is empty.');
  draft=correctFixture(draft,f.id,{homeScore:m.participant_home_score,awayScore:m.participant_away_score,appearances,reason:'Owner-requested VA historical baseline. Verified original EA match/player identities; continue future collection from EA.'},{actor,now});
  const result=draft.acceptedResults.at(-1);result.matchId=report.ea.matchId;result.timestamp=Number(report.ea.timestamp)*1000;result.eaOriginal={homeScore:number(game.clubs[f.home.eaClubId].goals??game.clubs[f.home.eaClubId].score),awayScore:number(game.clubs[f.away.eaClubId].goals??game.clubs[f.away.eaClubId].score),appearances:[]};
  result.provenance={kind:'va-match-report',vaMatchId:String(m.id),url:'https://ufl.virtualarena.app/matches/'+m.id,playerStats:'reported',recordedAt:now,postedAt:m.posted_at};
  rawEvidence.push({fixtureId:f.id,matchId:report.ea.matchId,game});imported.push(f.id);
 }
 const baseline={id:source.id,source:source.source,sourceSnapshotAt:source.snapshotAt,statsFetchedAt:source.statsFetchedAt,importedAt:now,actor,fixtureIds:imported,playerLinks:[...links.values()],originalEaEvidence:rawEvidence,sourcePlayerTotals:source.players};
 const next={...saved,settings,acceptedResults:draft.acceptedResults,pendingResults:draft.pendingResults,internationalBaseline:baseline};
 const projection=projectLeague({draft:next});
 for(const expected of source.standings){const historical=projectLeague({draft:{...next,acceptedResults:next.acceptedResults.filter(r=>imported.includes(r.fixtureId))}}).standings.find(t=>t.id===expected.id);for(const metric of ['played','wins','draws','losses','goalsFor','goalsAgainst','points'])if(historical?.[metric]!==expected[metric])throw Error('Baseline standings do not match VA: '+expected.id+' '+metric);}
 const historicalPlayers=projectLeague({draft:{...next,acceptedResults:next.acceptedResults.filter(r=>imported.includes(r.fixtureId))}}).players;
 for(const expected of source.players){const id=sourcePeople.get(expected.teamId+':'+sourceKey(expected.sourceUrl)),actual=historicalPlayers.find(p=>p.teamId===expected.teamId&&p.playerId===id);if(!actual)throw Error('VA leaderboard player is missing from the match sheets: '+expected.name);for(const metric of ['apps','goals','assists'])if(expected[metric]!==null&&expected[metric]!==actual[metric])throw Error('VA baseline statistic needs review: '+expected.name+' '+metric);if(expected.rating!==null&&(actual.rating===null||Math.abs(expected.rating-actual.rating)>.051))throw Error('VA baseline average rating needs review: '+expected.name);}
 return {next,summary:{matches:imported.length,goals:source.standings.reduce((n,t)=>n+t.goalsFor,0),appearances:draft.acceptedResults.filter(r=>imported.includes(r.fixtureId)).reduce((n,r)=>n+r.appearances.length,0),players:historicalPlayers.length,totalMatches:projection.totals.played,existingResultsPreserved:(saved.acceptedResults||[]).length,tonight:'9:00 / 9:30 PM Central'}};
}

export async function readInternationalVaReport(matchId,fetcher=fetch){
 if(!/^\d+$/.test(String(matchId)))throw Error('Invalid VA match ID.');
 const response=await fetcher('https://ufl.virtualarena.app/matches/'+matchId,{headers:{accept:'text/html'},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('VA historical report unavailable: HTTP '+response.status);
 const html=await response.text(),match=html.match(/data-page="([^"]+)"/);if(!match)throw Error('Missing VA historical match report.');
 const decode=value=>value.replaceAll('&quot;','"').replaceAll('&#039;',"'").replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
 return JSON.parse(decode(match[1])).props;
}
