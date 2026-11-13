export const INTERNATIONAL_TRACKER_ID='ufl-internationals-ea-test-20261112';
export const INTERNATIONAL_COLLECTOR_RELEASE='international-tracker-20261112-v1';
export const INTERNATIONAL_COUNTRIES=['ARG','BRA','CAN','ENG','ESP','FRA','GER','ITA','MEX','USA'];
const localDate=(stamp,zone)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(stamp);
export function buildInternationalSchedule(settings){
 const calendar=settings.internationalSchedule,teams=new Map(settings.teams.map(t=>[t.id,t]));
 if(settings.serverLeagueId!==INTERNATIONAL_TRACKER_ID||settings.format!=='6v6'||calendar?.version!==1||calendar.competitionId!=='ufl-internationals'||teams.size!==10||INTERNATIONAL_COUNTRIES.some(id=>!teams.has(id))||!Array.isArray(calendar.fixtures)||!calendar.fixtures.length||calendar.fixtures.length>45)throw Error('Invalid international test calendar.');
 const ids=new Set(),slots=new Set(),pairs=new Set(),clubIds=new Set();
 for(const team of teams.values()){if(!/^\d{1,20}$/.test(team.eaClubId||'')||clubIds.has(team.eaClubId))throw Error('Each national team needs a distinct linked EA club.');clubIds.add(team.eaClubId);}
 const fixtures=calendar.fixtures.map(f=>{
  if(!/^va-intl-\d+$/.test(f.id||'')||ids.has(f.id)||!Number.isSafeInteger(f.startsAt)||!teams.has(f.homeId)||!teams.has(f.awayId)||f.homeId===f.awayId||f.stage!=='league'||!Number.isInteger(f.round)||f.round<1||f.round>9)throw Error('Invalid international fixture.');
  ids.add(f.id);const pair=[f.homeId,f.awayId].sort().join(':');if(pairs.has(pair))throw Error('Duplicate international pairing.');pairs.add(pair);
  for(const id of [f.homeId,f.awayId]){const slot=f.startsAt+':'+id;if(slots.has(slot))throw Error('National team has two fixtures at one kickoff.');slots.add(slot);}
  return {...f,date:localDate(f.startsAt,settings.timeZone),home:teams.get(f.homeId),away:teams.get(f.awayId),status:'scheduled'};
 }).sort((a,b)=>a.startsAt-b.startsAt||a.id.localeCompare(b.id));
 const dates=[...new Set(fixtures.map(f=>f.date))];for(const f of fixtures)f.week=dates.indexOf(f.date)+1;
 const nights=dates.map((date,i)=>({week:i+1,date,fixtures:fixtures.filter(f=>f.date===date),byes:settings.teams.filter(t=>!fixtures.some(f=>f.date===date&&(f.home.id===t.id||f.away.id===t.id)))}));
 return {settings,fixtures,nights,registrationOpen:false,scheduleGenerated:true,warnings:[calendar.baselineIncluded?'Verified VA history plus ongoing automatic EA collection. November 12 kickoff confirmed at 9:00/9:30 PM Central. Knockouts are excluded.':'International EA-only parallel test. Earlier VA results/stats remain on the public site until imported. Knockouts are excluded.']};
}
