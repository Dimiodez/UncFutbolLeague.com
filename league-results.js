import {fixtureCandidates} from './league-engine.js';
import {awardLeagueKey} from './league-awards-model.js';
import {FOOTBALL_POSITIONS} from './fc27-formations.js';
const score=value=>{if(value===null||value===undefined||value==='')throw Error('EA did not provide both scores. Do not guess a result.');const n=Number(value);if(!Number.isInteger(n)||n<0||n>100)throw Error('Invalid EA score.');return n;};
export function acceptFixtureResult(draft,fixtureId,game,finish){
 const fixture=draft.fixtures.find(f=>f.id===fixtureId),results=draft.acceptedResults||[];
 if(!fixture||results.some(r=>r.fixtureId===fixtureId))throw Error('Fixture is missing or already accepted.');
 if(!['regular','extraTime'].includes(finish))throw Error('Confirm whether the game ended in regular time or extra time.');
 const candidates=fixtureCandidates(fixture,[game],{timeZone:draft.settings.timeZone,acceptedMatchIds:results.map(r=>r.matchId)});
 if(candidates.candidates.length!==1)throw Error('This EA game does not match the scheduled clubs, date and kickoff window, or was already used.');
 const home=game.clubs[fixture.home.eaClubId],away=game.clubs[fixture.away.eaClubId];if(!home||!away)throw Error('Missing EA club data.');
 const homeScore=score(home.goals??home.score),awayScore=score(away.goals??away.score);if(homeScore===awayScore)throw Error('No draws allowed. A tied/penalty result needs a separate reviewed winner workflow.');
 const result={fixtureId,matchId:String(game.matchId??game.id),homeScore,awayScore,finish,timestamp:game.playedAt??Number(game.timestamp)*1000,appearances:[]};
 for(const team of [fixture.home,fixture.away])for(const [playerId,player] of Object.entries(game.players?.[team.eaClubId]||{})){
  const name=player.playername??player.name;if(typeof name!=='string'||!name.trim())continue;
  const numeric=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
  const position=FOOTBALL_POSITIONS.includes(player.position)?player.position:null;
  result.appearances.push({playerId,name,teamId:team.id,teamName:team.name,position,rating:numeric(player.rating),goals:numeric(player.goals),assists:numeric(player.assists)});
 }
 return {...draft,acceptedResults:[...results,result]};
}
// Restore through the same match/duplicate/score gate, not a trusted imported status flag.
export function restoreAcceptedResults(draft,results=[]){
 if(!Array.isArray(results)||results.length>1600)throw Error('Invalid saved results.');
 let checked={...draft,acceptedResults:[]};
 for(const result of results){const fixture=checked.fixtures.find(f=>f.id===result.fixtureId);if(!fixture)throw Error('Saved result has no scheduled fixture.');
  checked=acceptFixtureResult(checked,result.fixtureId,{matchId:result.matchId,playedAt:result.timestamp,clubs:{[fixture.home.eaClubId]:{goals:result.homeScore},[fixture.away.eaClubId]:{goals:result.awayScore}}},result.finish);
  if(!Array.isArray(result.appearances)||result.appearances.length>50)throw Error('Invalid saved player appearances.');
  const seen=new Set();checked.acceptedResults.at(-1).appearances=result.appearances.map(p=>{if(!p||typeof p.playerId!=='string'||!p.playerId||seen.has(p.playerId)||typeof p.name!=='string'||p.name.length>100||!p.name.trim()||![fixture.home.id,fixture.away.id].includes(p.teamId)||p.position!==null&&!FOOTBALL_POSITIONS.includes(p.position)||['rating','goals','assists'].some(key=>p[key]!==null&&(!Number.isFinite(p[key])||p[key]<0))||p.rating>10)throw Error('Invalid saved player appearance.');seen.add(p.playerId);return {...p,teamName:[fixture.home,fixture.away].find(t=>t.id===p.teamId).name};});
 }return checked;
}
export function acceptedAppearances(draft){return (draft.acceptedResults||[]).flatMap(result=>result.appearances.map(player=>({...player,matchId:result.matchId,timestamp:result.timestamp,status:'accepted',leagueKey:awardLeagueKey(draft.settings),season:draft.settings.season})));}
export function leagueStandings(draft){
 const policy=draft.settings.pageContent?.standings||{},rows=new Map(draft.settings.teams.map(team=>[team.id,{...team,played:0,wins:0,regularWins:0,extraWins:0,extraLosses:0,regularLosses:0,goalsFor:0,goalsAgainst:0,points:0,headToHead:0}]));
 for(const result of draft.acceptedResults||[]){const f=draft.fixtures.find(f=>f.id===result.fixtureId);if(!f)continue;const home=rows.get(f.home.id),away=rows.get(f.away.id);if(!home||!away)continue;
  for(const [team,own,other] of [[home,result.homeScore,result.awayScore],[away,result.awayScore,result.homeScore]]){team.played++;team.goalsFor+=own;team.goalsAgainst+=other;const win=own>other,extra=result.finish==='extraTime';team[extra?(win?'extraWins':'extraLosses'):(win?'regularWins':'regularLosses')]++;if(win)team.wins++;team.points+=extra?(win?(policy.extraTimeWin??2):(policy.extraTimeLoss??1)):(win?(policy.win??3):(policy.loss??0));}
 }
 for(const result of draft.acceptedResults||[]){const f=draft.fixtures.find(f=>f.id===result.fixtureId),a=rows.get(f?.home.id),b=rows.get(f?.away.id);if(!a||!b||a.points!==b.points)continue;for(const [team,own,other] of [[a,result.homeScore,result.awayScore],[b,result.awayScore,result.homeScore]])team.headToHead+=result.finish==='extraTime'?(own>other?(policy.extraTimeWin??2):(policy.extraTimeLoss??1)):(own>other?(policy.win??3):(policy.loss??0));}
 const metric=(row,key)=>key==='goalDifference'?row.goalsFor-row.goalsAgainst:row[key];
 return [...rows.values()].sort((a,b)=>{let diff=b.points-a.points;for(const key of policy.tiebreakers||['goalDifference','goalsFor','wins','headToHead'])diff||=metric(b,key)-metric(a,key);return diff||a.name.localeCompare(b.name);});
}
