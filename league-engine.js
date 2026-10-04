// Shared schedule and candidate matching logic. Never treats raw EA games as league results.
export function zonedTimestamp(date,time,timeZone){
 const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Choose a valid date and time.');
 const target=Date.UTC(year,month-1,day,hour,minute),formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let guess=target;
 const wall=stamp=>{const p=Object.fromEntries(formatter.formatToParts(stamp).map(part=>[part.type,part.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);};
 for(let iteration=0;iteration<4;iteration++){const difference=target-wall(guess);if(!difference)return guess;guess+=difference;}
 if(wall(guess)!==target)throw Error('That local time does not exist because the clocks change. Choose another time.');
 return guess;
}
export function buildLeagueSchedule(settings){
 const teams=settings.teams||[];
 if(teams.length<3||teams.length>40)throw Error('Choose 3–40 teams. Two different opponents per night need at least three teams.');
 if(new Set(teams.map(team=>team.id)).size!==teams.length)throw Error('A team can only be entered once.');
 const names=teams.map(team=>team.name.trim().toLowerCase());if(new Set(names).size!==teams.length)throw Error('Team names must be unique within this league.');
 const weekday=Number(settings.weekday),spacing=Number(settings.spacingMinutes);
 if(!Number.isInteger(weekday)||weekday<0||weekday>6||!Number.isInteger(spacing)||spacing<15||spacing>180)throw Error('Choose a valid matchnight and 15–180 minutes between games.');
 zonedTimestamp(settings.startDate,settings.time,settings.timeZone);
 const startDate=new Date(settings.startDate+'T12:00:00Z');
 startDate.setUTCDate(startDate.getUTCDate()+(weekday-startDate.getUTCDay()+7)%7);
 const rotation=[...teams];if(rotation.length%2)rotation.push(null);
 const rounds=[];
 for(let round=0;round<rotation.length-1;round++){
  const fixtures=[];
  for(let index=0;index<rotation.length/2;index++){
   const a=rotation[index],b=rotation[rotation.length-1-index];
   if(a&&b)fixtures.push({home:round%2?b:a,away:round%2?a:b});
  }
  rounds.push(fixtures);rotation.splice(1,0,rotation.pop());
 }
 const allRounds=[...rounds,...rounds.map(fixtures=>fixtures.map(game=>({home:game.away,away:game.home})))];
 const fixtures=[],nights=[];
 for(let round=0;round<allRounds.length;round++){
  const night=Math.floor(round/2),date=new Date(startDate);date.setUTCDate(date.getUTCDate()+night*7);const localDate=date.toISOString().slice(0,10);
  if(!nights[night])nights[night]={week:night+1,date:localDate,fixtures:[]};
  const timestamp=zonedTimestamp(localDate,settings.time,settings.timeZone)+(round%2)*spacing*60000;
  for(const game of allRounds[round]){const fixture={id:`fixture-${fixtures.length+1}`,week:night+1,round:round+1,date:localDate,startsAt:timestamp,home:game.home,away:game.away,status:'scheduled'};fixtures.push(fixture);nights[night].fixtures.push(fixture);}
 }
 return {settings,fixtures,nights,warnings:teams.length%2?['An odd number of teams requires byes; some teams will have one game rather than two on a night.']:[]};
}
export function fixtureCandidates(fixture,games,{beforeMinutes=15,afterMinutes=90,acceptedMatchIds=[]}={}){
 const home=String(fixture.home.eaClubId||''),away=String(fixture.away.eaClubId||'');
 if(!home||!away||home===away)return {status:'unlinked',candidates:[]};
 const unique=new Map(),used=new Set(acceptedMatchIds.map(String));
 for(const game of games){
  const id=String(game.matchId??game.id),clubs=Array.isArray(game.clubs)?game.clubs.map(club=>String(club.id)):Object.keys(game.clubs||{});
  const playedAt=game.playedAt??Number(game.timestamp)*1000;
  if(id==='undefined'||used.has(id)||clubs.length!==2||!clubs.includes(home)||!clubs.includes(away)||!Number.isFinite(playedAt))continue;
  if(playedAt<fixture.startsAt-beforeMinutes*60000||playedAt>fixture.startsAt+afterMinutes*60000)continue;
  unique.set(id,game);
 }
 const candidates=[...unique.values()];
 return {status:candidates.length>1?'ambiguous':candidates.length===1?'review':'waiting',candidates};
}
