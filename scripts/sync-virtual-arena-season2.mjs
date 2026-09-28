import {writeFile} from 'node:fs/promises';

const origin='https://ufl.virtualarena.app';
const sources=[
  {division:'6v6',competitionId:1,seasonId:2},
  {division:'10v10',competitionId:2,seasonId:3}
];

const decode=value=>value.replaceAll('&quot;','"').replaceAll('&#039;',"'")
  .replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>')
  .replaceAll('&amp;','&').replace(/&#(\d+);/g,(_,code)=>String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi,(_,code)=>String.fromCodePoint(Number.parseInt(code,16)));

async function props(base,path,competitionId,seasonId){
  const response=await fetch(`${base}/${path}`,{headers:{'user-agent':'UncFutbolLeague.com data sync'}});
  if(!response.ok)throw Error(`Virtual Arena ${base}/${path} returned ${response.status}`);
  const match=(await response.text()).match(/data-page="([^"]+)"/);
  if(!match)throw Error(`Virtual Arena ${base}/${path} did not contain season data`);
  const data=JSON.parse(decode(match[1])).props;
  if(data.competition?.id!==competitionId||data.season?.id!==seasonId)throw Error(`Virtual Arena ${base}/${path} returned a different competition or season`);
  return data;
}

function latestTimestamp(values){
  const dates=values.map(value=>Date.parse(value)).filter(Number.isFinite);
  if(!dates.length)throw Error('Virtual Arena did not provide a season timestamp');
  return new Date(Math.max(...dates)).toISOString();
}

for(const {division,competitionId,seasonId} of sources){
  const base=`${origin}/competitions/${competitionId}/seasons/${seasonId}`;
  const [matchData,standingData,teamData,statData]=await Promise.all([
    props(base,'matches',competitionId,seasonId),
    props(base,'standings',competitionId,seasonId),
    props(base,'teams',competitionId,seasonId),
    props(base,'stats',competitionId,seasonId)
  ]);
  const teamRows=teamData.teams?.data??[];
  const byName=new Map(teamRows.map(team=>[team.name,`team-${team.id}`]));
  const key=team=>{
    const value=byName.get(team.name);
    if(!value)throw Error(`Unknown ${division} team in Virtual Arena: ${team.name}`);
    return value;
  };
  const teams=Object.fromEntries(teamRows.map(team=>[`team-${team.id}`,[team.name,team.image??'']]));
  const teamDetails=teamRows.map(team=>({
    key:key(team),name:team.name,abbreviation:team.team?.abbr||team.name,
    logo:team.image??'',url:team.url,rosterSize:team.users_count??null,stats:team.stats??{}
  }));
  const standings=(standingData.standings??[]).map(row=>{
    const s=row.stats;
    return [key(row),s.played,s.wins,s.draws,s.losses,s.goals_for,s.goals_against,s.goal_difference,s.points];
  });
  const groups=(matchData.schedule?.matches??[]).map(group=>Object.values(group)[0]??[]);
  const dates=new Map((matchData.schedule?.dates??[]).map(date=>[date.round_id,date]));
  const weeks=groups.filter(group=>group.length).map((matches,index)=>{
    const date=dates.get(matches[0].competition_season_round_id)??matchData.schedule.dates[index];
    return {week:index+1,date:date?.date?.replace(/(\d{1,2}:\d{2})(AM|PM)/,'$1 $2')??'',scheduledAt:date?.scheduled_at??null,
      matches:matches.map(match=>[match.id,key(match.participant_home),key(match.participant_away),match.participant_home_score,match.participant_away_score])};
  });
  const timestamps=[matchData.season?.updated_at,standingData.season?.updated_at,teamData.season?.updated_at,statData.season?.updated_at,
    ...teamRows.map(row=>row.updated_at),...(standingData.standings??[]).map(row=>row.updated_at),
    ...groups.flat().map(match=>match.posted_at)].filter(Boolean);
  const syncedAt=latestTimestamp(timestamps);
  const season={division,uflSeason:2,competitionId,seasonId,source:`${base}/matches`,
    standingsSource:`${base}/standings`,teamsSource:`${base}/teams`,statsSource:`${base}/stats`,
    syncedAt,statsFetchedAt:syncedAt,teams,teamDetails,standings,weeks,
    leaderboards:{players:statData.leaderboards?.players??{}}};
  const target=`pickems-app/season-data-${division}-s2.json`;
  await writeFile(target,`${JSON.stringify(season,null,2)}\n`);
  await writeFile(`pickems-app/season-data-${division}-s2.js`,`window.UFL_SEASON_${division.replace('v','V')}_S2 = ${JSON.stringify(season,null,2)};\n`);
  console.log(`Synced ${division} UFL Season 2 (VA competition ${competitionId}, season ${seasonId}): ${teamDetails.length} teams, ${weeks.length} matchweeks, ${standings.length} table rows to ${target}.`);
}
