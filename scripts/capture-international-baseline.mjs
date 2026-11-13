// Generate the frozen owner-requested VA baseline. Never imports new match results.
import fs from 'node:fs';
import {readInternationalVaReport} from '../functions/_lib/international-baseline.js';
const snapshot=JSON.parse(fs.readFileSync(new URL('../pickems-app/seasons/s1-internationals.json',import.meta.url),'utf8'));
const fixtures=snapshot.fixtures.filter(f=>f.stage==='league'&&f.status==='played'&&f.startsAt<'2026-11-12T00:00:00.000Z');
if(fixtures.length!==10)throw Error('Expected the ten completed pre-test international matches.');
const reports=[];
for(let i=0;i<fixtures.length;i+=3){
 const rows=await Promise.all(fixtures.slice(i,i+3).map(async fixture=>{
  const p=await readInternationalVaReport(fixture.sourceMatchId),m=p.match,ea=p.eafcMatch;
  if(p.competition?.id!==4||p.season?.id!==6||m?.id!==fixture.sourceMatchId||m.competition_season_id!==6||!m.posted_at||m.participant_home_score!==fixture.homeScore||m.participant_away_score!==fixture.awayScore||!/^\d+$/.test(String(ea?.fc_match_id||'')))throw Error('VA baseline evidence changed or is incomplete: '+fixture.id);
  const lineup=side=>Object.fromEntries(Object.entries(m['participant_'+side+'_lineup']?.players||{}).map(([key,v])=>[key,{id:v.id,name:v.name,url:v.url}]));
  return {fixtureId:fixture.id,homeId:fixture.homeId,awayId:fixture.awayId,competitionId:4,seasonId:6,match:{id:m.id,competition_season_id:m.competition_season_id,participant_home_id:m.participant_home_id,participant_away_id:m.participant_away_id,participant_home_score:m.participant_home_score,participant_away_score:m.participant_away_score,posted_at:m.posted_at,forfeit:!!m.forfeit,participant_home_stats:m.participant_home_stats,participant_away_stats:m.participant_away_stats,participant_home_lineup:{players:lineup('home')},participant_away_lineup:{players:lineup('away')}},ea:{matchId:String(ea.fc_match_id),timestamp:ea.timestamp,homeClubId:String(ea.home_team_id),awayClubId:String(ea.away_team_id),homeScore:ea.home_team_score,awayScore:ea.away_team_score}};
 }));reports.push(...rows);
}
const evidence={id:'va-internationals-baseline-20261112',source:snapshot.source,competitionId:4,seasonId:6,snapshotAt:snapshot.syncedAt,statsFetchedAt:snapshot.statsFetchedAt,capturedAt:new Date().toISOString(),reports:reports.sort((a,b)=>a.match.id-b.match.id),players:snapshot.players,standings:snapshot.standings};
const destination=new URL('../data/international-baseline-20261112.json',import.meta.url);if(fs.existsSync(destination))throw Error('Frozen evidence already exists; do not overwrite it.');
fs.writeFileSync(destination,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({reports:reports.length,goals:reports.reduce((n,r)=>n+r.match.participant_home_score+r.match.participant_away_score,0),playerRows:evidence.players.length}));
