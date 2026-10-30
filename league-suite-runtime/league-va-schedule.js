// VA is a fixture-calendar source only. Never read provider scores or player stats.
export const VA_TEST_SOURCES={
 'ufl-6v6-20261015':{competitionId:1,seasonId:2,format:'6v6'},
 'ufl-10v10-20261020':{competitionId:3,seasonId:5,format:'10v10'}
};
const localDate=(stamp,zone)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(stamp);
const teamKey=name=>String(name||'').normalize('NFKD').toLowerCase().replace(/^ufl\s+/,'').replace(/ta6asco/g,'tabasco').replace(/[^a-z0-9]/g,'');
const decode=value=>value.replaceAll('&quot;','"').replaceAll('&#039;',"'").replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
export async function fetchVaSchedule(source,fetcher=fetch){
 const url=`https://ufl.virtualarena.app/competitions/${source.competitionId}/seasons/${source.seasonId}/matches`;
 const response=await fetcher(url,{headers:{accept:'text/html','user-agent':'UFL EA test fixture calendar'},signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!response.ok)throw Error(`VA fixture calendar HTTP ${response.status}`);
 const html=await response.text(),match=html.match(/data-page="([^"]+)"/);if(!match)throw Error('VA fixture calendar is missing season data.');
 const props=JSON.parse(decode(match[1])).props;
 if(props?.competition?.id!==source.competitionId||props?.season?.id!==source.seasonId)throw Error('VA returned a different competition or season.');
 return props;
}
export function importVaSchedule(draft,props,{now=Date.now()}={}){
 const source=VA_TEST_SOURCES[draft.settings.trialSchedule];
 if(!source||draft.settings.format!==source.format||props?.competition?.id!==source.competitionId||props?.season?.id!==source.seasonId)throw Error('Wrong VA calendar for this test league.');
 const settings=draft.settings,teams=new Map(settings.teams.map(t=>[teamKey(t.name),t]));
 if(teams.size!==settings.teams.length)throw Error('Ambiguous registered team names.');
 const dates=props.schedule?.dates,groups=props.schedule?.matches;
 if(!Array.isArray(dates)||!dates.length||!Array.isArray(groups)||!groups.length)throw Error('VA calendar is empty; keeping the saved schedule.');
 const byRound=new Map(dates.map(d=>[d.round_id,d])),fixtures=[],seen=new Set(),playing=new Set(),usedOld=new Set();
 const accepted=new Set((draft.acceptedResults||[]).map(r=>r.fixtureId));
 for(const group of groups){
  const matches=Object.values(group).filter(Array.isArray).flat();if(!matches.length)throw Error('VA returned an empty fixture round.');
  for(const match of matches){
   const round=byRound.get(match.competition_season_round_id),startsAt=Number(round?.scheduled_at)*1000;
   const home=teams.get(teamKey(match.participant_home?.name)),away=teams.get(teamKey(match.participant_away?.name));
   if(!round||!Number.isSafeInteger(startsAt)||startsAt<1577836800000||startsAt>4102444800000||!home||!away||home.id===away.id||!Number.isSafeInteger(match.id)||match.id<=0)throw Error('VA fixture has an unknown team, invalid ID or missing kickoff.');
   if(seen.has(match.id))throw Error('Duplicate VA fixture ID.');seen.add(match.id);
   for(const team of [home,away]){const key=`${round.round_id}:${team.id}`;if(playing.has(key))throw Error('VA team appears twice in one round.');playing.add(key);}
   const date=localDate(startsAt,settings.timeZone),vaMatchId=String(match.id);
   const prior=(draft.fixtures||[]).filter(f=>f.vaMatchId===vaMatchId||(!f.vaMatchId&&f.date===date&&[f.home.id,f.away.id].includes(home.id)&&[f.home.id,f.away.id].includes(away.id)));
   if(prior.length>1)throw Error('Ambiguous existing fixture mapping.');
   const old=prior[0];if(old){if(usedOld.has(old.id))throw Error('An existing fixture would be mapped twice.');usedOld.add(old.id);}
   const entry={id:old?.id||`ea-va-${source.competitionId}-${source.seasonId}-${vaMatchId}`,vaMatchId,round:Number(String(round.round_name||'').match(/\d+/)?.[0]),date,startsAt,homeId:home.id,awayId:away.id};
   if(!Number.isInteger(entry.round)||entry.round<1)throw Error('VA round is missing its number.');
   // Past reviewed evidence keeps its identity, orientation and kickoff, even if VA edits it.
   if(old&&accepted.has(old.id))Object.assign(entry,{date:old.date,startsAt:old.startsAt,homeId:old.home.id,awayId:old.away.id});
   fixtures.push(entry);
  }
 }
 for(const old of draft.fixtures||[])if(accepted.has(old.id)&&!usedOld.has(old.id))throw Error('VA calendar would remove an accepted fixture; keeping the saved schedule.');
 fixtures.sort((a,b)=>a.startsAt-b.startsAt||a.id.localeCompare(b.id));
 const calendarDates=[...new Set(fixtures.map(f=>f.date))].sort();for(const f of fixtures)f.week=calendarDates.indexOf(f.date)+1;
 const vaSchedule={version:1,...source,source:`https://ufl.virtualarena.app/competitions/${source.competitionId}/seasons/${source.seasonId}/matches`,checkedAt:new Date(now).toISOString(),fixtures};
 const updated={...draft,settings:{...settings,vaSchedule,collectionEnabled:true,scoringMode:'standard'}};
 return {...updated,...buildVaSchedule(updated.settings),acceptedResults:draft.acceptedResults||[],pendingResults:draft.pendingResults||[]};
}
export function buildVaSchedule(settings){
 const calendar=settings.vaSchedule,source=VA_TEST_SOURCES[settings.trialSchedule];
 if(!source||calendar?.version!==1||calendar.competitionId!==source.competitionId||calendar.seasonId!==source.seasonId||settings.format!==source.format||!Array.isArray(calendar.fixtures)||!calendar.fixtures.length||calendar.fixtures.length>1600)throw Error('Invalid saved VA test calendar.');
 const teams=new Map(settings.teams.map(t=>[t.id,t])),ids=new Set(),vaIds=new Set(),slots=new Set();
 const fixtureTeam=(team,date)=>{
  const replacement=team?.eaClubReplacement;if(!replacement)return team;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(replacement.from)||!/^\d+$/.test(replacement.previousId)||typeof replacement.name!=='string'||replacement.name.length>80)throw Error('Invalid EA club replacement.');
  return date<replacement.from?{...team,eaClubId:replacement.previousId}:{...team,name:replacement.name,eaClubId:team.eaClubId===replacement.previousId?'':team.eaClubId};
 };
 const fixtures=calendar.fixtures.map(f=>{
  const home=fixtureTeam(teams.get(f.homeId),f.date),away=fixtureTeam(teams.get(f.awayId),f.date);
  if(!home||!away||home.id===away.id||typeof f.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(f.id)||ids.has(f.id)||!/^\d+$/.test(f.vaMatchId)||vaIds.has(f.vaMatchId)||!Number.isSafeInteger(f.startsAt)||localDate(f.startsAt,settings.timeZone)!==f.date||!Number.isInteger(f.round)||f.round<1||!Number.isInteger(f.week)||f.week<1)throw Error('Invalid saved VA fixture.');
  ids.add(f.id);vaIds.add(f.vaMatchId);for(const team of [home,away]){const key=`${f.startsAt}:${team.id}`;if(slots.has(key))throw Error('Team appears twice at one kickoff.');slots.add(key);}
  return {...f,home,away,status:'scheduled'};
 }).sort((a,b)=>a.startsAt-b.startsAt||a.id.localeCompare(b.id));
 const dates=[...new Set(fixtures.map(f=>f.date))].sort(),nights=dates.map((date,i)=>{const games=fixtures.filter(f=>f.date===date);return {week:i+1,date,fixtures:games,byes:settings.teams.filter(t=>!games.some(f=>f.home.id===t.id||f.away.id===t.id))};});
 return {settings,registrationOpen:false,scheduleGenerated:true,fixtures,nights,skippedDates:[],warnings:['EA-only test results. Full VA fixture calendar saved; scores and player stats are not imported from VA. Calendar refreshes automatically; accepted results and corrections remain protected.']};
}
export function mergeSharedTestDraft(local,shared){
 const calendar=shared.settings?.vaSchedule;
 const base=calendar?{...local,...buildVaSchedule({...local.settings,vaSchedule:calendar,teams:shared.settings.teams,collectionEnabled:true,scoringMode:'standard'})}:local;
 const merged=new Map((local.acceptedResults||[]).map(r=>[r.fixtureId,r]));
 for(const result of shared.acceptedResults||[]){const prior=merged.get(result.fixtureId);if(!prior?.correction?.localOnly)merged.set(result.fixtureId,result);}
 const acceptedResults=[...merged.values()];for(const result of acceptedResults)if(!base.fixtures.some(f=>f.id===result.fixtureId))throw Error('Shared calendar is missing a saved result; browser draft retained.');
 const pendingResults=(shared.pendingResults||[]).filter(p=>!merged.has(p.fixtureId));
 return {...base,acceptedResults,pendingResults};
}
