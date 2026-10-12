// Public award presentation only. Never reads workshop drafts or browser storage.
(() => {
 const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
 const divisions=['6v6','10v10'];
 const sources=Object.freeze({'1':Object.freeze({'6v6':'https://ufl.virtualarena.app/competitions/1/seasons/1/squads'}),'2':Object.freeze({
  '6v6':'https://ufl.virtualarena.app/competitions/1/seasons/2/squads',
  '10v10':'https://ufl.virtualarena.app/competitions/3/seasons/5/squads'
 })});
 function gameweeks(season){
  const days=new Map();
  for(const week of season?.weeks||[]){
   const stamp=Number(week.scheduledAt||week.matches?.find(m=>m[5])?.[5]);
   const date=stamp?new Intl.DateTimeFormat('en-CA',{timeZone:season.timeZone||'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(stamp*1000):`week-${week.week}`;
   if(!days.has(date))days.set(date,{date,stamp,label:week.date||'',matches:new Map(),rounds:new Set()});
   const day=days.get(date);
   for(const match of week.matches||[])day.matches.set(String(match[0]),match);
   for(const round of week.rounds||[])day.rounds.add(round.round);
  }
  return [...days.values()].sort((a,b)=>(a.stamp||0)-(b.stamp||0)).map((day,index)=>({...day,number:index+1,fixtureCount:day.matches.size,roundCount:day.rounds.size||new Set([...day.matches.values()].map(m=>m[6]).filter(Boolean)).size}));
 }
 // This catalog stays empty until approved official awards are supplied.
 // Future shared publishing must supply public records, not private draft state.
 const publications=window.UFL_ARCHIVED_AWARDS||[];
 const safeImage=value=>{try{const url=new URL(value,location.origin);return url.protocol==='https:'||url.origin===location.origin?escape(url.href):'';}catch{return '';}};
 const positions=['ST','CAM','ST','LM','CDM','CDM','RM','CB','CB','CB'];
 function lineup(record){
  if(record?.formation!=='352'||!Array.isArray(record.players)||record.players.length!==10)return '';
  return `<div class="award-lineup"><div class="award-lineup-heading"><strong>3–5–2</strong><span>Season 1 archive · 6v6</span></div><div class="award-pitch" role="group" aria-label="Gameweek ${record.gameweek} official 3-5-2 lineup"><div class="award-pitch-lines" aria-hidden="true"><i></i><b></b></div>${record.players.map(p=>`<div class="award-player award-slot-${p.slot}"><div class="award-player-avatar"><span aria-hidden="true">${escape(p.name.slice(0,1))}</span>${safeImage(p.image)?`<img src="${safeImage(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</div><span class="award-player-name" title="${escape(p.name)}">${escape(p.name)}</span><small>${positions[p.slot-1]}</small></div>`).join('')}</div><p class="award-lineup-note">Official archived selection · 10 outfield players · No goalkeeper selected</p></div>`;
 }
 function page(params){
  const season=selectedLeagueSeason(params),kind=params.get('award')==='tots'?'tots':'totw';
  const activeDivisions=divisions.filter(d=>season.divisions[d]);
  const calendars=Object.fromEntries(activeDivisions.map(d=>[d,gameweeks(leagueSeasonFor(d,season.id))]));
  const records=publications.filter(p=>p.published===true&&String(p.season)===season.id);
  const archivedWeeks=records.filter(p=>p.kind==='totw').map(p=>Number(p.gameweek)||0);
  const count=archivedWeeks.length?Math.max(...archivedWeeks):Math.max(0,...Object.values(calendars).map(days=>days.length));
  const requested=Number(params.get('week')),week=Number.isInteger(requested)&&requested>=1&&requested<=count?requested:1;
  const href=(overrides={})=>'/totw?'+new URLSearchParams({season:season.id,award:kind,...(kind==='totw'?{week:String(week)}:{}),...overrides});
  const cards=activeDivisions.map(division=>{
   const calendar=calendars[division],day=calendar[week-1],available=!!season.divisions[division];
   const record=records.find(p=>p.division===division&&p.kind===kind&&(kind==='tots'||Number(p.gameweek)===week));
   const image=record?.imageUrl?safeImage(record.imageUrl):'',pitch=lineup(record);
   const date=day?.stamp?new Intl.DateTimeFormat('en-US',{timeZone:leagueSeasonFor(division,season.id)?.timeZone||'America/New_York',weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(day.stamp*1000):day?.label;
   return `<article class="award-division"><header><span class="section-kicker">${division} · ${escape(season.label)}</span><h3>${kind==='totw'?`Gameweek ${week}`:'Team of the Season'}</h3><p>${record?.rounds?`Rounds ${record.rounds.join('–')} · Official archived selection`:kind==='tots'?'Full-season selection':date?`${escape(date)}${day.roundCount?` · ${day.roundCount} rounds`:''}${day.fixtureCount?` · ${day.fixtureCount} fixtures`:''}`:'Match day to be confirmed'}</p></header>${pitch|| (image?`<figure><img src="${image}" alt="${escape(record.title||`${division} ${kind.toUpperCase()} ${kind==='totw'?`Gameweek ${week}`:season.label}`)}" loading="lazy"><figcaption>${escape(record.title||'Official league selection')}</figcaption></figure>`:`<div class="award-empty"><img src="/assets/ufl-mark.webp" alt="" width="72" height="84"><strong>${!available?'Not contested':kind==='totw'&&!day&&count?'No match day scheduled':'Not announced yet'}</strong><p>${!available?`${division} was not played in ${escape(season.label)}.`:kind==='totw'&&!day&&count?'This division does not have a scheduled match day for this gameweek.':`The official ${division} ${kind==='totw'?'Team of the Week':'Team of the Season'} will appear here once announced.`}</p></div>`)}${kind==='totw'&&sources[season.id]?.[division]?`<footer class="award-source"><a class="button button-secondary" href="${record?.source||sources[season.id][division]}" target="_blank" rel="noopener noreferrer">Open VA TOTW archive ↗</a><small>Official ${division} selections on Virtual Arena</small></footer>`:''}</article>`;
  }).join('');
  return pageHero('UFL · League awards','The week’s best.<br>The season’s finest.','Official Team of the Week and Team of the Season selections for the 6v6 and 10v10 leagues.')+`<section class="section award-page"><a class="award-return" href="/league" data-link>← League hub</a><div class="award-toolbar"><div><span class="section-kicker">League honours</span><h2>TOTW / TOTS</h2></div><label>Season<select data-award-season>${leagueSeasonOptions.map(s=>`<option value="${s.id}" ${s.id===season.id?'selected':''}>${s.label} · ${s.game}</option>`).join('')}</select></label></div><nav class="tabs" aria-label="Award type"><a class="tab ${kind==='totw'?'active':''}" href="${href({award:'totw',week:String(week)})}" data-link ${kind==='totw'?'aria-current="page"':''}>Team of the Week</a><a class="tab ${kind==='tots'?'active':''}" href="/totw?season=${season.id}&award=tots" data-link ${kind==='tots'?'aria-current="page"':''}>Team of the Season</a></nav>${kind==='totw'?`<p class="award-explainer">One gameweek is one match day: both rounds count together. Each playing club has two scheduled games; a full-night bye is a night off.</p>${count?`<nav class="award-week-tabs" aria-label="Award gameweek">${Array.from({length:count},(_,i)=>`<a class="tab ${i+1===week?'active':''}" href="${href({week:String(i+1)})}" data-link ${i+1===week?'aria-current="page"':''}>Gameweek ${i+1}</a>`).join('')}</nav>`:'<p class="sync-note">Gameweek tabs will appear when the league schedule is available.</p>'}`:'<p class="award-explainer">The full season, celebrated in one lineup for each division.</p>'}<div class="award-period-heading"><span>${kind==='totw'?`Gameweek ${week}`:'Season selection'}</span><h2>${kind==='totw'?'Team of the Week':'Team of the Season'}</h2></div><div class="award-division-grid ${activeDivisions.length===1?'award-division-grid-single':''}">${cards}</div><p class="award-footnote">Only announced official selections appear here. Match results do not automatically publish an award lineup.</p></section>`;
 }
 window.UFLAwards={gameweeks,page,sources};
 window.hydrateLeagueAwards=()=>{
 document.querySelectorAll('.award-player-avatar img').forEach(img=>{
  const fallback=()=>img.remove();
  img.addEventListener('error',fallback,{once:true});
  if(img.complete&&!img.naturalWidth)fallback();
 });
 document.querySelector('[data-award-season]')?.addEventListener('change',event=>{
  const params=new URLSearchParams(location.search);params.set('season',event.target.value);params.delete('week');
  history.pushState({},'',`/totw?${params}`);render();
 });
 };
})();
