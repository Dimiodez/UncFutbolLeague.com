import {escape as esc} from './team-hub-shell.js?v=20261013-recovery2';

const views=[['overview','Overview'],['squad','Squad'],['tactics','Lineups & tactics'],['settings','Club settings']];
const mediaFields=[['logo','Club logo'],['banner','Club banner'],['stadium','Stadium photo']];
const cache=new Map();
let portraits;

function json(path){
 return fetch(path,{credentials:'same-origin',cache:'no-store'}).then(response=>{
  if(!response.ok)throw Error('Data unavailable.');
  return response.json();
 });
}

export function clubHubView(){
 const current=new URLSearchParams(location.search).get('view');
 return views.some(([id])=>current===id)?current:'overview';
}

function hubPortrait(player,approved){
 return approved?.byIdentity?.[player.id]||approved?.portraits?.[player.profileId]||
  window.playerPortraitSource?.({id:player.profileId||player.id,identity:player.id,name:player.name})||'';
}

function fixtureSummary(season,team){
 if(!season?.weeks?.length)return null;
 const official=typeof leagueOfficialClubLinks==='undefined'?null:leagueOfficialClubLinks[team.division]?.[team.key];
 const provider=season.teamDetails?.find(entry=>official?entry.teamId===official.teamId:entry.key===team.key);
 if(!provider)return null;
 const key=provider.key,table=season.standings||[],place=table.findIndex(row=>row[0]===key);
 const rows=season.weeks.flatMap(week=>week.matches.filter(row=>row[1]===key||row[2]===key).map(row=>({row,kickoff:row[5]||week.scheduledAt})));
 const next=rows.filter(({row,kickoff})=>!Number.isFinite(row[3])&&kickoff*1000>=Date.now()-7200000).sort((a,b)=>a.kickoff-b.kickoff).slice(0,2);
 const recent=rows.filter(({row})=>Number.isFinite(row[3])&&Number.isFinite(row[4])).sort((a,b)=>b.kickoff-a.kickoff).slice(0,3);
 return {table,place,key,next,recent};
}

function summaryMarkup(season,team){
 const data=fixtureSummary(season,team);
 const makeRows=(list,played)=>list.length?'<ul class="club-match-list">'+list.map(({row,kickoff})=>{
  const home=row[1]===data.key,opponent=season.teams?.[row[home?2:1]]?.[0]||row[home?2:1];
  const date=window.UFLTime?.format?.(kickoff*1000)||new Date(kickoff*1000).toLocaleString();
  const score=played?row[home?3:4]+'–'+row[home?4:3]:home?'Home':'Away';
  return '<li><div><small>'+esc(date)+'</small><strong>'+esc(opponent)+'</strong></div><strong>'+esc(score)+'</strong></li>';
 }).join('')+'</ul>':'<p class="club-dash-empty">'+(played?'No posted results.':'No upcoming fixtures.')+'</p>';
 const link=(view,label)=>'<a href="'+esc(team.publicUrl+'&view='+view)+'">'+label+' →</a>';
 if(!data)return '<section class="club-dash-panel"><h3>Matchday</h3><p class="club-dash-empty">Club fixtures and standings will appear when published.</p>'+link('calendar','Club calendar')+'</section>';
 const record=data.place>=0?data.table[data.place]:null;
 return '<div class="club-dash-grid"><section class="club-dash-panel"><div class="club-panel-heading"><h3>Next fixtures</h3>'+link('calendar','Calendar')+'</div>'+makeRows(data.next,false)+'</section>'+
  '<section class="club-dash-panel"><div class="club-panel-heading"><h3>Recent results</h3>'+link('history','Match history')+'</div>'+makeRows(data.recent,true)+'</section></div>'+
  (record?'<section class="club-dash-panel"><div class="club-panel-heading"><h3>League record</h3><a href="/standings?season=2&division='+esc(team.division)+'">Standings →</a></div><div class="league-mini-stats">'+
   [['Position',data.place+1],['Played',record[1]],['Wins',record[2]],['Points',record[8]]].map(([label,value])=>'<div><strong>'+esc(value)+'</strong><span>'+label+'</span></div>').join('')+'</div></section>':'');
}

function clubMedia(team,published){
 const source=typeof leagueProvisionalSeasons==='undefined'?null:leagueProvisionalSeasons[team.division]?.clubs.find(club=>club.key===team.key);
 return {logo:published.logo||source?.logo||team.logo,banner:published.banner||'',stadium:published.image||source?.image||''};
}

function fillFaces(root,roster,approved){
 const players=new Map(roster.map(player=>[player.id,player]));
 root.querySelectorAll('[data-hub-face]').forEach(slot=>{
  const player=players.get(slot.dataset.hubFace), source=player&&hubPortrait(player,approved);
  if(!source)return;
  const img=document.createElement('img');
  img.src=source;img.alt='';img.loading='lazy';img.decoding='async';
  slot.replaceChildren(img);
  slot.hidden=false;
 });
}

function brandSettings(host,team,scope,loaded){
 const {media,access}=loaded;
 const canUpload=!!access?.canUpload;
 host.innerHTML='<section class="club-dash-panel"><h3>Club branding</h3><p class="club-dash-empty">'+
   (canUpload?'Club images publish as uploaded. Stadium artwork and the profile banner have separate slots.':'Club images are managed by authorized team managers and league staff.')+
   '</p><div class="club-brand-grid">'+mediaFields.map(([kind,label])=>
    '<article><h4>'+label+'</h4>'+(media[kind]?'<img src="'+esc(media[kind])+'" alt="'+label+'" data-club-preview="'+kind+'">':'<p data-club-preview="'+kind+'">No image published</p>')+
    (canUpload?'<form data-club-image="'+kind+'"><label>Choose '+label.toLowerCase()+'<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required></label><button type="submit" class="hub-primary">Upload &amp; publish</button><small>JPEG, PNG or WebP · up to 5 MB</small></form>':'')+
    '</article>').join('')+'</div><p data-brand-status role="status"></p></section>'+
   '<section class="club-dash-panel"><h3>Membership and EA club</h3><p class="club-dash-empty">League staff verify rosters, manager assignments and the EA club used to collect results.</p>'+
   (team.canAssign?'<a href="/team-hub-access">Manage team access →</a> · <a href="/admin">League administration →</a>':'<a href="/contact">Request a roster or EA club change →</a>')+'</section>';
 host.querySelectorAll('[data-club-image]').forEach(form=>form.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=form.querySelector('button'),status=host.querySelector('[data-brand-status]');
  const kind=form.dataset.clubImage, body=new FormData(form);
  body.set('action','upload');body.set('kind',kind);body.set('division',team.division);body.set('team',team.key);
  button.disabled=true;status.textContent='Publishing image…';
  try{
   const response=await fetch('/api/team-media/manage',{method:'POST',credentials:'same-origin',body});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Unable to publish image.');
   media[kind]=result.url;
   form.reset();
   const preview=host.querySelector('[data-club-preview="'+kind+'"]'),img=document.createElement('img');
   img.src=result.url;img.alt=mediaFields.find(item=>item[0]===kind)[1];img.dataset.clubPreview=kind;
   preview.replaceWith(img);
   if(kind==='logo')scope.querySelector('.hub-hero > img').src=result.url;
   updateHero(scope,media);
   status.textContent='Image published.';
  }catch(error){status.textContent=error.message;}
  finally{button.disabled=false;}
 }));
}

function updateHero(root,media){
 const hero=root.querySelector('.hub-hero');
 if(media.logo)hero.querySelector('img').src=media.logo;
 if(!media.banner)return;
 let banner=hero.querySelector('.hub-club-banner');
 if(!banner){
  banner=document.createElement('img');banner.className='hub-club-banner';banner.alt='';hero.append(banner);
 }
 banner.src=media.banner;
}

export function installClubHub(root,context,board){
 const {team,roster}=context;
 const tactics=root.querySelector('.hub-shell');
 if(!tactics)return;
 tactics.dataset.hubView='tactics';
 const nav=document.createElement('nav');
 nav.className='club-dashboard-tabs';
 nav.setAttribute('aria-label','Team Hub sections');
 const base=new URL(location.href);
 const links=views.map(([view,label])=>{
  const button=document.createElement('button');button.type='button';button.dataset.hubNav=view;button.textContent=label;nav.append(button);return button;
 });
 const season=document.createElement('a');season.href='/season';season.textContent='Season ↗';nav.append(season);
 const personMarkup=player=>'<span class="hub-face" data-hub-face="'+esc(player.id)+'" hidden></span><strong>'+esc(player.name)+'</strong>';
 const positionOf=player=>board?.slots.find(slot=>slot.playerId===player.id)?.id;
 const panel=(view,html)=>{
  const element=document.createElement('section');element.dataset.hubView=view;element.className='hub-view-panel';
  element.innerHTML=html;return element;
 };
 const lineup=roster.filter(positionOf);
 const overview=panel('overview','<div data-hub-matchday><p class="club-dash-empty">Loading club fixtures…</p></div>'+
  '<section class="club-dash-panel"><div class="club-panel-heading"><h3>Lineup preview</h3><button type="button" class="hub-link" data-open-tactics>Open lineups &amp; tactics</button></div>'+
  (lineup.length?'<p>'+esc(board.name)+' · '+esc(board.formation)+'</p><div class="club-lineup-pitch" role="img" aria-label="'+esc(board.formation)+' lineup preview">'+
    lineup.map(player=>{
     const position=board.slots.find(slot=>slot.playerId===player.id);
     const x=Math.max(8,Math.min(92,Number(position.x)||50)),y=Math.max(8,Math.min(92,Number(position.y)||50));
     return '<div class="club-lineup-player" style="left:'+x+'%;top:'+y+'%">'+personMarkup(player)+'<small>'+esc(position.id)+'</small></div>';
    }).join('')+'</div>':'<p class="club-dash-empty">Assigned players from your selected tactics board appear here.</p>')+'</section>');
 const squad=panel('squad','<section class="club-dash-panel"><div class="club-panel-heading"><h3>Registered squad</h3><span>'+roster.length+' players</span></div>'+
  (roster.length?'<ul class="hub-squad-list" data-squad-members>'+roster.map(player=>'<li>'+personMarkup(player)+
   '<small>'+esc(positionOf(player)||'Unassigned')+'</small><a href="/players/'+encodeURIComponent(player.profileId||player.id)+'?season=2&amp;division='+esc(team.division)+'">Player profile →</a></li>').join('')+'</ul>':'<p class="club-dash-empty">No registered players yet.</p>')+
  '<p class="club-dash-empty" data-squad-note>Player portraits follow the registered player profile.</p></section>');
 const settings=panel('settings','<section class="club-dash-panel"><h3>Club settings</h3><p class="club-dash-empty">Loading your club branding and access…</p></section>');
 tactics.before(nav,overview,squad,settings);
 const sections=[overview,squad,tactics,settings];
 function show(view){
  sections.forEach(item=>{item.hidden=item.dataset.hubView!==view;});
  links.forEach(button=>button.setAttribute('aria-current',button.dataset.hubNav===view?'page':'false'));
 }
 function navigate(view){
  base.searchParams.set('view',view);
  history.replaceState(history.state,'',base);
  show(view);
 }
 links.forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.hubNav)));
 overview.querySelector('[data-open-tactics]').addEventListener('click',()=>navigate('tactics'));
 show(clubHubView());
 portraits||=json('/api/player-portraits').catch(()=>null);
 portraits.then(approved=>{if(nav.isConnected)fillFaces(root,roster,approved);});
 if(!cache.has(team.id)){
  cache.set(team.id,Promise.all([
   json('/api/team-media').catch(()=>({})),
   json('/api/team-media/manage?division='+encodeURIComponent(team.division)+'&team='+encodeURIComponent(team.key)).catch(()=>null),
   json('/pickems-app/seasons/s2-'+team.division+'.json').catch(()=>null)
  ]).then(([published,access,seasonData])=>({media:clubMedia(team,published.teams?.[team.id]||{}),access,seasonData})));
 }
 cache.get(team.id).then(loaded=>{
  if(!nav.isConnected)return;
  updateHero(root,loaded.media);
  brandSettings(settings,team,root,loaded);
  overview.querySelector('[data-hub-matchday]').innerHTML=summaryMarkup(loaded.seasonData,team);
  if(loaded.access?.canUpload){
   squad.querySelector('[data-squad-note]').textContent='To submit a player face, open the player profile. An owner or administrator must approve it before publication.';
  }
 });
}
