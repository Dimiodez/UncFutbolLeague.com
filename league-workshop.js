import {createLeagueDraft,registerLeagueTeam,buildLeagueSchedule,fixtureCandidates,zonedTimestamp} from './league-engine.js';
const form=document.querySelector('#league-builder'),message=document.querySelector('#workshop-message'),root=document.querySelector('#league-drafts'),review=document.querySelector('#candidate-review'),save=document.querySelector('#save-drafts'),download=document.querySelector('#export-drafts');
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const KEY='ufl-v2-workshop-drafts-v1';let drafts=[];
form.elements.startDate.value=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
form.elements.format.addEventListener('change',()=>{if(form.elements.format.value!=='Custom'){form.elements.size.value=form.elements.format.value==='10v10'?10:6;form.elements.weekday.value=form.elements.format.value==='10v10'?'2':'4';}});
function settingsFrom(values){
 if(!values||typeof values.season!=='string'||typeof values.league!=='string'||!values.season.trim()||!values.league.trim()||values.season.length>80||values.league.length>80)throw Error('Enter a season and league name.');
 if(!['6v6','10v10','Custom'].includes(values.format)||!Number.isInteger(Number(values.size))||values.size<1||values.size>11)throw Error('Choose a valid format and team size.');
 if(!Array.isArray(values.teams)||values.teams.some(team=>!team.name?.trim()||team.name.length>80||!/^team-\d+$/.test(team.id)||team.eaClubId&&!/^\d{1,20}$/.test(team.eaClubId)))throw Error('Use valid team names and numeric EA club IDs.');
 const ids=values.teams.map(team=>team.eaClubId).filter(Boolean);if(new Set(ids).size!==ids.length)throw Error('Two teams cannot use the same EA club within this league.');
 return values;
}
function renderDrafts(){
 save.disabled=download.disabled=!drafts.length;
 root.innerHTML=drafts.length?drafts.map((draft,index)=>`<article class="card workshop-league"><span class="section-kicker">${escape(draft.settings.season)} · ${escape(draft.settings.format)} · Draft only</span><h2>${escape(draft.settings.league)}</h2><p>${draft.settings.teams.length} teams · ${draft.fixtures.length} fixtures · ${draft.nights.length} nights${draft.scheduleGenerated?' · Everyone meets twice':' · Waiting for teams'}</p>${draft.warnings.map(warning=>`<p class="workshop-warning">${escape(warning)}</p>`).join('')}${draft.nights.map(night=>`<details ${night.week===1?'open':''}><summary>Night ${night.week} · ${escape(night.date)}</summary>${night.fixtures.map(fixture=>`<div class="workshop-fixture"><div><strong>${escape(fixture.home.name)} vs ${escape(fixture.away.name)}</strong><time>${escape(new Intl.DateTimeFormat('en-US',{timeZone:draft.settings.timeZone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(fixture.startsAt))}</time></div><button data-league="${index}" data-fixture="${escape(fixture.id)}" ${fixture.home.eaClubId&&fixture.away.eaClubId?'':'disabled'}>Check EA candidates</button></div>`).join('')}</details>`).join('')}</article>`).join(''):'<p class="empty-state">No built-in leagues. Create your first draft to see fixtures here.</p>';
 root.querySelectorAll('[data-fixture]').forEach(button=>button.addEventListener('click',()=>checkFixture(Number(button.dataset.league),button.dataset.fixture,button)));
 root.querySelectorAll('.workshop-league').forEach((card,index)=>{
  const draft=drafts[index],section=document.createElement('section');section.className='workshop-registration';
  section.innerHTML=`<h3>Teams · Registration ${draft.registrationOpen?'open':'closed'}</h3><p>${draft.scheduleGenerated?'Draft schedule generated. Reopening registration clears it so new teams can be included.':'No schedule yet. Add teams now or return later; at least 3 teams are needed only when generating fixtures.'}</p><ul>${draft.settings.teams.map(team=>`<li><strong>${escape(team.name)}</strong>${team.eaClubId?` · EA club ${escape(team.eaClubId)} (not verified)`:' · EA club not linked'}</li>`).join('')||'<li>No teams registered yet.</li>'}</ul><form data-register="${index}"><div class="workshop-pair"><label>Team name<input name="name" maxlength="80" required ${draft.registrationOpen?'':'disabled'}></label><label>EA club ID (optional)<input name="eaClubId" inputmode="numeric" pattern="[0-9]{1,20}" ${draft.registrationOpen?'':'disabled'}></label></div><button type="submit" ${draft.registrationOpen?'':'disabled'}>Register team in this draft</button></form><div class="workshop-toolbar"><button data-registration="${index}">${draft.registrationOpen?'Close registration':'Reopen registration'}</button><button data-generate="${index}" ${draft.settings.teams.length<3||draft.registrationOpen?'disabled':''}>${draft.scheduleGenerated?'Regenerate':'Generate'} draft fixtures</button></div><small>Close registration when your teams are ready. Names and IDs entered here do not prove EA ownership or grant manager permissions.</small>`;
  card.querySelector('p').after(section);
 });
 root.querySelectorAll('[data-register]').forEach(teamForm=>teamForm.addEventListener('submit',event=>{event.preventDefault();try{const index=Number(teamForm.dataset.register);drafts[index]=registerLeagueTeam(drafts[index],Object.fromEntries(new FormData(teamForm)));renderDrafts();message.textContent='Team registered in this league draft. Save your drafts to keep the change.';}catch(error){message.textContent=error.message;}}));
 root.querySelectorAll('[data-registration]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.registration),draft=drafts[index];if(!draft.registrationOpen&&draft.scheduleGenerated&&!confirm('Reopen registration and clear this draft schedule? Teams are preserved. No live results are affected.'))return;drafts[index]=draft.registrationOpen?{...draft,registrationOpen:false}:createLeagueDraft(draft.settings);review.hidden=true;renderDrafts();message.textContent='Draft registration updated. Save your drafts to keep the change.';}));
 root.querySelectorAll('[data-generate]').forEach(button=>button.addEventListener('click',()=>{try{const index=Number(button.dataset.generate);drafts[index]=buildLeagueSchedule(drafts[index].settings);renderDrafts();message.textContent='Draft fixtures generated. Nothing was published or counted as an official result.';}catch(error){message.textContent=error.message;}}));
}
form.addEventListener('submit',event=>{event.preventDefault();try{
 const fields=Object.fromEntries(new FormData(form));
 const settings=settingsFrom({...fields,size:Number(fields.size),teams:[]});
 zonedTimestamp(settings.startDate,settings.time,settings.timeZone);
 if(drafts.some(draft=>draft.settings.season.trim().toLowerCase()===settings.season.trim().toLowerCase()&&draft.settings.league.trim().toLowerCase()===settings.league.trim().toLowerCase()))throw Error('That league already exists in this season draft. Use another name.');
 drafts.push(createLeagueDraft(settings));renderDrafts();message.textContent='League created with registration open. Add teams whenever they are known. Save your drafts to keep it.';
 }catch(error){message.textContent=error.message;}});
function draftFile(){return {version:2,leagues:drafts.map(draft=>({settings:draft.settings,registrationOpen:draft.registrationOpen,scheduleGenerated:draft.scheduleGenerated}))};}
function restoreDrafts(data){
 if(Array.isArray(data))data={version:1,leagues:data};
 if(!data||![1,2].includes(data.version)||!Array.isArray(data.leagues)||data.leagues.length>20)throw Error('Not a supported UFL draft file.');
 return data.leagues.map(entry=>{
  const settings=settingsFrom(data.version===1?entry:entry.settings);
  zonedTimestamp(settings.startDate,settings.time,settings.timeZone);
  let validated=createLeagueDraft({...settings,teams:[]});
  for(const team of settings.teams)validated=registerLeagueTeam(validated,team);
  if(data.version===1||entry.scheduleGenerated)return buildLeagueSchedule(validated.settings);
  return {...validated,registrationOpen:entry.registrationOpen!==false};
 });
}
save.addEventListener('click',()=>{try{localStorage.setItem(KEY,JSON.stringify(draftFile()));message.textContent='Saved on this device only. Download the draft file to share or move to another PC.';}catch{message.textContent='This browser could not save the draft. Download the file instead.';}});
download.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(draftFile(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ufl-league-drafts.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.querySelector('#import-drafts').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>1000000)throw Error('Choose a draft file smaller than 1 MB.');const data=JSON.parse(await file.text());const loaded=restoreDrafts(data);drafts=loaded;renderDrafts();message.textContent='Draft file opened. Nothing was registered or published.';}catch(error){message.textContent=error.message;}finally{event.target.value='';}});
try{const cached=JSON.parse(localStorage.getItem(KEY)||'[]');drafts=restoreDrafts(cached);}catch{/* Leave invalid or older drafts untouched in storage. */}renderDrafts();
async function checkFixture(index,id,button){
 const draft=drafts[index],fixture=draft.fixtures.find(game=>game.id===id);button.disabled=true;review.hidden=false;review.innerHTML='<h2>Checking scheduled matchup…</h2>';
 try{const response=await fetch(`/api/ea/clubs/${encodeURIComponent(fixture.home.eaClubId)}/matches`),data=await response.json();if(!response.ok)throw Error(data.error);const result=fixtureCandidates(fixture,data.matches),labels={waiting:'No matching result in the scheduled window',review:'One candidate—staff approval required',ambiguous:'Multiple candidates—staff must choose the correct game',unlinked:'Link both EA clubs first'};
 review.innerHTML=`<span class="section-kicker">Result review · Not counted</span><h2>${escape(fixture.home.name)} vs ${escape(fixture.away.name)}</h2><h3>${labels[result.status]}</h3><p>Checks require both EA club IDs and a timestamp from 15 minutes before to 90 minutes after kickoff. Finding a game does not prove it was the official fixture. No goals, standings, or awards are updated by this check.${data.partial?' Some EA feeds were unavailable.':''}</p>${result.candidates.map(game=>`<article><strong>${Object.values(game.clubs).map(club=>`${escape(club.clubName??club.name)} ${escape(club.score??club.goals)}`).join(' vs ')}</strong><p>${escape(new Date(Number(game.timestamp)*1000).toLocaleString())}</p><small>EA game ${escape(game.matchId)} · Pending review</small></article>`).join('')}`;
 }catch(error){review.innerHTML=`<h2>Could not check EA</h2><p>${escape(error.message)}</p>`;}finally{button.disabled=false;}
}
