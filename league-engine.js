// Shared schedule and candidate matching logic. Never treats raw EA games as league results.
export function validateTeamRules(values){
 if(!['6v6','10v10','Custom'].includes(values.format))throw Error('Choose a valid format.');
 const size=values.format==='6v6'?6:values.format==='10v10'?10:Number(values.size);
 const maxTeamSize=Number(values.maxTeamSize??size);
 if(!Number.isInteger(size)||size<1||size>11)throw Error('Custom formats need 1–11 players per side.');
 if(!Number.isInteger(maxTeamSize)||maxTeamSize<size||maxTeamSize>100)throw Error(`Maximum roster size must be ${size}–100, including substitutes.`);
 if(![undefined,true,false,'on'].includes(values.keepersEnabled))throw Error('Choose whether keepers are enabled.');
 return {...values,size,maxTeamSize,keepersEnabled:values.keepersEnabled===true||values.keepersEnabled==='on'};
}
export function validateScheduleSettings(settings){
 settings=validateTeamRules(settings);
 const interval=Number(settings.repeatWeeks??1),weekday=Number(settings.weekday),spacing=Number(settings.spacingMinutes);
 if(!Number.isInteger(interval)||interval<1||interval>4)throw Error('Repeat games every 1–4 weeks.');
 if(!Number.isInteger(weekday)||weekday<0||weekday>6||!Number.isInteger(spacing)||spacing<15||spacing>180)throw Error('Choose a valid matchnight and 15–180 minutes between games.');
 zonedTimestamp(settings.startDate,settings.time,settings.timeZone);
 const breaks=settings.breaks??[];
 if(!Array.isArray(breaks)||breaks.length>100)throw Error('Use at most 100 breaks per league.');
 for(const pause of breaks){
  zonedTimestamp(pause.from,'12:00',settings.timeZone);zonedTimestamp(pause.to,'12:00',settings.timeZone);
  if(pause.from>pause.to)throw Error('A break must end on or after it starts.');
  if(typeof pause.reason!=='string'||!pause.reason.trim()||pause.reason.length>80)throw Error('Name each break (holiday, cup, or other reason).');
 }
 const windows=settings.windows??[];
 if(!Array.isArray(windows)||windows.length>100)throw Error('Use at most 100 league windows.');
 for(const window of windows){
  if(!['registration','transfer','bye','holiday','cup','break'].includes(window.type))throw Error('Choose a valid window type.');
  zonedTimestamp(window.from,'12:00',settings.timeZone);zonedTimestamp(window.to,'12:00',settings.timeZone);
  if(window.from>window.to)throw Error('The window must end on or after it starts.');
  if(typeof window.name!=='string'||!window.name.trim()||window.name.length>80)throw Error('Name the window (up to 80 characters).');
  if(window.type==='registration'&&window.to>=settings.startDate)throw Error('Registration must end before the league start date.');
  if(window.type==='transfer'&&window.from<settings.startDate)throw Error('Midseason transfers must start on or after the league start date.');
 }
 return {...settings,repeatWeeks:interval,breaks,windows};
}
export function leagueWindowState(window,timeZone,now=Date.now()){
 const end=new Date(window.to+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+1);
 const opens=zonedTimestamp(window.from,'00:00',timeZone),closes=zonedTimestamp(end.toISOString().slice(0,10),'00:00',timeZone);
 return now<opens?'upcoming':now>=closes?'closed':'open';
}
export function registrationAllowed(draft,now=Date.now()){
 const windows=(draft.settings.windows||[]).filter(window=>window.type==='registration');
 return draft.registrationOpen&&(!windows.length||windows.some(window=>leagueWindowState(window,draft.settings.timeZone,now)==='open'));
}
export function zonedTimestamp(date,time,timeZone){
 const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Choose a valid date and time.');
 if(new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10)!==date)throw Error('Choose a real calendar date.');
 const target=Date.UTC(year,month-1,day,hour,minute),formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 let guess=target;
 const wall=stamp=>{const p=Object.fromEntries(formatter.formatToParts(stamp).map(part=>[part.type,part.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);};
 for(let iteration=0;iteration<4;iteration++){const difference=target-wall(guess);if(!difference)return guess;guess+=difference;}
 if(wall(guess)!==target)throw Error('That local time does not exist because the clocks change. Choose another time.');
 return guess;
}
export function createLeagueDraft(settings){
 return {settings:{...settings,teams:[...(settings.teams||[])]},registrationOpen:true,scheduleGenerated:false,fixtures:[],nights:[],warnings:[]};
}
export function registerLeagueTeam(draft,team,{now=Date.now(),restoring=false}={}){
 if(!restoring&&!registrationAllowed(draft,now))throw Error('Registration is closed or outside this league’s registration window.');
 if(draft.scheduleGenerated)throw Error('Reopen registration before changing teams. This clears the draft schedule.');
 const name=String(team.name||'').trim(),eaClubId=String(team.eaClubId||'').trim();
 if(!name||name.length>80||eaClubId&&!/^\d{1,20}$/.test(eaClubId))throw Error('Enter a team name and, optionally, a numeric EA club ID.');
 const teams=draft.settings.teams;
 if(teams.length>=40)throw Error('This draft supports up to 40 teams.');
 if(teams.some(existing=>existing.name.trim().toLowerCase()===name.toLowerCase()||eaClubId&&existing.eaClubId===eaClubId))throw Error('That team name or EA club is already registered in this league.');
 const nextId=Math.max(0,...teams.map(existing=>Number(existing.id.replace('team-',''))))+1;
 return {...draft,settings:{...draft.settings,teams:[...teams,{id:`team-${nextId}`,name,eaClubId}]}};
}
export function buildLeagueSchedule(settings){
 settings=validateScheduleSettings(settings);
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
 const fixtures=[],nights=[],skippedDates=[];
 const scheduledDates=[],cursor=new Date(startDate),calendarBreaks=[...settings.breaks,...settings.windows.filter(window=>['bye','holiday','cup','break'].includes(window.type)).map(window=>({from:window.from,to:window.to,reason:window.name}))];
 for(let attempt=0;scheduledDates.length<Math.ceil(allRounds.length/2);attempt++){
  if(attempt>1000)throw Error('Too many skipped dates. Shorten the breaks.');
  const date=cursor.toISOString().slice(0,10),pauses=calendarBreaks.filter(pause=>date>=pause.from&&date<=pause.to);
  if(pauses.length)skippedDates.push({date,reasons:pauses.map(pause=>pause.reason)});else scheduledDates.push(date);
  cursor.setUTCDate(cursor.getUTCDate()+settings.repeatWeeks*7);
 }
 for(let round=0;round<allRounds.length;round++){
  const night=Math.floor(round/2),localDate=scheduledDates[night];
  if(!nights[night])nights[night]={week:night+1,date:localDate,fixtures:[]};
  const timestamp=zonedTimestamp(localDate,settings.time,settings.timeZone)+(round%2)*spacing*60000;
  for(const game of allRounds[round]){const fixture={id:`fixture-${fixtures.length+1}`,week:night+1,round:round+1,date:localDate,startsAt:timestamp,home:game.home,away:game.away,status:'scheduled'};fixtures.push(fixture);nights[night].fixtures.push(fixture);}
 }
 return {settings,registrationOpen:false,scheduleGenerated:true,fixtures,nights,skippedDates,warnings:teams.length%2?['An odd number of teams requires byes; some teams will have one game rather than two on a night.']:[]};
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
