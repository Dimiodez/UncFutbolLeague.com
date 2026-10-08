import {createLeagueDraft,registerLeagueTeam,buildLeagueSchedule,fixtureCandidates,zonedTimestamp,validateScheduleSettings,validateTeamRules,registrationAllowed} from './league-engine.js';
import {bindTeamRuleControls,readTeamRuleControls} from './team-rule-controls.js';
import {renderAdministration} from './league-administration.js';
import {renderLeaguePage} from './league-page.js';
import {editDraftTeam,removeDraftTeam,updatePageSettings} from './league-page-model.js';
import {acceptFixtureResult,restoreAcceptedResults} from './league-results.js';
import {enhanceLeagueWorkshop} from './league-workshop-ux.js';
import {registrationRequest} from './league-registration-invites.js';
const uxStyle=document.createElement('link');uxStyle.rel='stylesheet';uxStyle.href='/league-workshop-ux.css';document.head.append(uxStyle);
const form=document.querySelector('#league-builder'),message=document.querySelector('#workshop-message'),root=document.querySelector('#league-drafts'),review=document.querySelector('#candidate-review'),save=document.querySelector('#save-drafts'),download=document.querySelector('#export-drafts');
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const KEY='ufl-v2-workshop-drafts-v1';let drafts=[],seasons=[],competitions=[];
let activeLeague=null,activeTab='overview';
const pageHost=document.createElement('section');pageHost.className='league-page';pageHost.hidden=true;
document.querySelector('.workshop-layout').before(message,pageHost);
function persistDrafts(){localStorage.setItem(KEY,JSON.stringify(draftFile()));}
function pageReport(text){message.textContent=text;const status=pageHost.querySelector('[data-page-status]');if(status)status.textContent=text;}
let pendingCalendarChange=null;
function approveCalendarChange(signature,index){
 if(pendingCalendarChange===signature){pendingCalendarChange=null;return true;}
 pendingCalendarChange=signature;
 const target=activeLeague!==null?pageHost:index===undefined?document.querySelector('#league-overview'):document.querySelector(`#league-${index}`);
 document.querySelectorAll('.calendar-confirmation').forEach(notice=>notice.remove());
 const notice=document.createElement('p');notice.className='calendar-confirmation workshop-warning';notice.setAttribute('role','status');notice.textContent='This will rebuild the draft schedule. Submit the same change again to confirm. Teams and matchups are preserved; no live results are affected.';target.append(notice);
 message.textContent=notice.textContent;return false;
}
form.elements.startDate.value=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
bindTeamRuleControls(form);
form.elements.format.addEventListener('change',()=>{if(form.elements.format.value!=='Custom')form.elements.weekday.value=form.elements.format.value==='10v10'?'2':'4';});
function settingsFrom(values){
 if(values?.inviteBoardId!==undefined&&(typeof values.inviteBoardId!=='string'||!/^[A-Za-z0-9_-]{24}$/.test(values.inviteBoardId)))throw Error('Invalid shared registration board.');
 if(values?.managerInviteUrl!==undefined&&(typeof values.managerInviteUrl!=='string'||!/^https:\/\/(?:[a-zA-Z0-9-]+\.)?ufl-major-update-preview\.pages\.dev\/league-join\.html#[A-Za-z0-9_-]{43}$/.test(values.managerInviteUrl)))throw Error('Invalid preview registration invitation URL.');
 if(!values||typeof values.season!=='string'||typeof values.league!=='string'||!values.season.trim()||!values.league.trim()||values.season.length>80||values.league.length>80)throw Error('Enter a season and league name.');
 if(!Array.isArray(values.teams)||values.teams.some(team=>!team.name?.trim()||team.name.length>80||!/^team-\d+$/.test(team.id)||team.eaClubId&&!/^\d{1,20}$/.test(team.eaClubId)))throw Error('Use valid team names and numeric EA club IDs.');
 const ids=values.teams.map(team=>team.eaClubId).filter(Boolean);if(new Set(ids).size!==ids.length)throw Error('Two teams cannot use the same EA club within this league.');
 if(values.pagePublished!==undefined&&typeof values.pagePublished!=='boolean')throw Error('Invalid preview publication state.');
 if(values.pageContent!==undefined){
  if(!values.pageContent||typeof values.pageContent!=='object'||Array.isArray(values.pageContent))throw Error('Invalid league page content.');
  let validated={...values,pageContent:{}};
  for(const [section,content] of Object.entries(values.pageContent)){
   if(!content||typeof content!=='object'||Array.isArray(content)||content.text!==undefined&&typeof content.text!=='string'||content.links!==undefined&&(!Array.isArray(content.links)||content.links.some(link=>typeof link!=='string')))throw Error('Invalid league section content.');
   validated=updatePageSettings(validated,section,{...content,links:(content.links||[]).join('\n')});
  }
  values=validated;
 }
 return validateScheduleSettings(values);
}
function renderDrafts(){
 pendingCalendarChange=null;
 root.after(review);
 save.disabled=download.disabled=!(drafts.length||seasons.length||competitions.length);
 root.innerHTML=drafts.length?drafts.map((draft,index)=>`<article class="card workshop-league"><span class="section-kicker">${escape(draft.settings.season)} · ${escape(draft.settings.format)} · Draft only</span><h2>${escape(draft.settings.league)}</h2><p>${draft.settings.teams.length} teams · ${draft.fixtures.length} fixtures · ${draft.nights.length} nights${draft.scheduleGenerated?' · Everyone meets twice':' · Waiting for teams'}</p>${draft.warnings.map(warning=>`<p class="workshop-warning">${escape(warning)}</p>`).join('')}${draft.nights.map(night=>`<details ${night.week===1?'open':''}><summary>Night ${night.week} · ${escape(night.date)}</summary>${night.fixtures.map(fixture=>`<div class="workshop-fixture"><div><strong>${escape(fixture.home.name)} vs ${escape(fixture.away.name)}</strong><time>${escape(new Intl.DateTimeFormat('en-US',{timeZone:draft.settings.timeZone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(fixture.startsAt))}</time></div><button data-league="${index}" data-fixture="${escape(fixture.id)}" ${fixture.home.eaClubId&&fixture.away.eaClubId?'':'disabled'}>Check EA candidates</button></div>`).join('')}</details>`).join('')}</article>`).join(''):'<p class="empty-state">No built-in leagues. Create your first draft to see fixtures here.</p>';
 root.querySelectorAll('[data-fixture]').forEach(button=>button.addEventListener('click',()=>checkFixture(Number(button.dataset.league),button.dataset.fixture,button)));
 root.querySelectorAll('.workshop-league').forEach((card,index)=>{
  const draft=drafts[index],section=document.createElement('section');section.className='workshop-registration';
  section.innerHTML=`<h3>Teams · Registration ${draft.registrationOpen?'open':'closed'}</h3><p>${draft.scheduleGenerated?'Draft schedule generated. Reopening registration clears it so new teams can be included.':'No schedule yet. Add teams now or return later; at least 3 teams are needed only when generating fixtures.'}</p><ul>${draft.settings.teams.map(team=>`<li><strong>${escape(team.name)}</strong>${team.eaClubId?` · EA club ${escape(team.eaClubId)} (not verified)`:' · EA club not linked'}</li>`).join('')||'<li>No teams registered yet.</li>'}</ul><form data-register="${index}"><div class="workshop-pair"><label>Team name<input name="name" maxlength="80" required ${draft.registrationOpen?'':'disabled'}></label><label>EA club ID (optional)<input name="eaClubId" inputmode="numeric" pattern="[0-9]{1,20}" ${draft.registrationOpen?'':'disabled'}></label></div><button type="submit" ${draft.registrationOpen?'':'disabled'}>Register team in this draft</button></form><div class="workshop-toolbar"><button data-registration="${index}">${draft.registrationOpen?'Close registration':'Reopen registration'}</button><button data-generate="${index}" ${draft.settings.teams.length<3||draft.registrationOpen?'disabled':''}>${draft.scheduleGenerated?'Regenerate':'Generate'} draft fixtures</button></div><small>Close registration when your teams are ready. Names and IDs entered here do not prove EA ownership or grant manager permissions.</small>`;
  card.querySelector('p').after(section);
  if(!registrationAllowed(draft)){section.querySelectorAll('form input,form button').forEach(control=>control.disabled=true);if(draft.registrationOpen)section.querySelector('h3').textContent='Teams · Outside registration window';}
 });
 root.querySelectorAll('[data-register]').forEach(teamForm=>teamForm.addEventListener('submit',event=>{event.preventDefault();try{const index=Number(teamForm.dataset.register);drafts[index]=registerLeagueTeam(drafts[index],Object.fromEntries(new FormData(teamForm)));renderDrafts();message.textContent='Team registered in this league draft. Save your drafts to keep the change.';}catch(error){message.textContent=error.message;}}));
 root.querySelectorAll('[data-registration]').forEach(button=>button.addEventListener('click',async()=>{
  const index=Number(button.dataset.registration),draft=drafts[index];if(!draft.registrationOpen&&draft.scheduleGenerated&&!confirm('Reopen registration and clear this draft schedule? Teams are preserved. No live results are affected.'))return;
  button.disabled=true;try{
   if(draft.settings.inviteBoardId)await registrationRequest({action:'update',boardId:draft.settings.inviteBoardId,settings:draft.settings,open:!draft.registrationOpen});
   drafts[index]=draft.registrationOpen?{...draft,registrationOpen:false}:createLeagueDraft(draft.settings);review.hidden=true;persistDrafts();renderDrafts();pageReport('Registration updated and saved, including the shared invitation when connected.');
  }catch(error){button.disabled=false;pageReport(`Registration was not changed: ${error.message}`);}
 }));
 root.querySelectorAll('[data-generate]').forEach(button=>button.addEventListener('click',()=>{try{const index=Number(button.dataset.generate);drafts[index]=buildLeagueSchedule(drafts[index].settings);renderDrafts();message.textContent='Draft fixtures generated. Nothing was published or counted as an official result.';}catch(error){message.textContent=error.message;}}));
 renderAdministration({drafts,seasons,competitions,updateLeague,addSeason,addCompetition,report:text=>message.textContent=text});
 root.querySelectorAll('[data-registration],[data-generate]').forEach(button=>{const index=Number(button.dataset.registration??button.dataset.generate);if(drafts[index].acceptedResults?.length){button.disabled=true;button.title='Accepted results exist. Export a backup before starting a new season draft.';}});
 root.querySelectorAll('.workshop-league').forEach((card,index)=>{
  const button=document.createElement('button');button.type='button';button.textContent='Open league tabs';button.onclick=()=>{try{persistDrafts();activeLeague=index;activeTab='overview';renderDrafts();pageHost.scrollIntoView({block:'start'});}catch(error){message.textContent=`Could not save this draft: ${error.message}`;}};card.querySelector('h2').after(button);
 });
 if(activeLeague!==null&&!drafts[activeLeague])activeLeague=null;
 document.querySelector('.workshop-layout').hidden=activeLeague!==null;
 document.querySelector('#league-overview').hidden=activeLeague!==null;
 pageHost.hidden=activeLeague===null;
 if(activeLeague!==null){
  const index=activeLeague;
  renderLeaguePage({host:pageHost,card:root.querySelector(`#league-${index}`),draft:drafts[index],allDrafts:drafts,index,tab:activeTab,
   onTab:tab=>{activeTab=tab;renderDrafts();},onClose:()=>{activeLeague=null;renderDrafts();},
   onSettings:settings=>{updateLeague(index,settings);persistDrafts();},
   onSave:()=>{persistDrafts();pageReport('All league drafts saved on this device. Use Download draft file in All leagues & seasons to move them to another PC.');},
   onTeamEdit:(id,values)=>{drafts[index]=editDraftTeam(drafts[index],id,values);renderDrafts();persistDrafts();pageReport('Team changes saved on this device.');},
   onImportTeam:(team,{checkOnly=false}={})=>{
    if(drafts[index].settings.teams.some(t=>t.remoteTeamId===team.id))return;
    let next=registerLeagueTeam(drafts[index],{name:team.name,eaClubId:team.ea_id});
    if(checkOnly)return;
    const added=next.settings.teams.at(-1);added.remoteTeamId=team.id;added.managerDiscordId=team.manager_id;
    drafts[index]=next;persistDrafts();renderDrafts();
   },
   onTeamRemove:id=>{drafts[index]=removeDraftTeam(drafts[index],id);renderDrafts();persistDrafts();pageReport('Team removed from this draft league only. No live data was changed. Restore an exported draft backup to recover it.');},onReport:pageReport});
 }
 enhanceLeagueWorkshop({drafts,activeLeague,activeTab,pageHost});
}
function updateLeague(index,values){
 const settings=settingsFrom(values),draft=drafts[index];
 if(drafts.some((other,otherIndex)=>otherIndex!==index&&other.settings.season.trim().toLowerCase()===settings.season.trim().toLowerCase()&&other.settings.league.trim().toLowerCase()===settings.league.trim().toLowerCase()))throw Error('That league already exists in this season.');
 const calendarKey=value=>JSON.stringify([value.startDate,value.weekday,value.time,value.timeZone,value.spacingMinutes,value.repeatWeeks,value.byePolicy??'split',value.breaks,(value.windows||[]).filter(window=>['bye','holiday','cup','break'].includes(window.type))]);
 const calendarChanged=calendarKey(settings)!==calendarKey(draft.settings);
 if(calendarChanged&&draft.acceptedResults?.length)throw Error('Accepted test results exist. Export a backup and create a new league draft instead of rebuilding its fixtures.');
 const updated=draft.scheduleGenerated&&calendarChanged?buildLeagueSchedule(settings):{...draft,settings};
 if(draft.scheduleGenerated&&calendarChanged&&!approveCalendarChange(`league-${index}:${JSON.stringify(settings)}`,index))return;
 // Keep competition references consistent when a draft league is renamed or moved.
 competitions=competitions.map(cup=>cup.season===draft.settings.season&&cup.league===draft.settings.league?{...cup,season:settings.season,league:settings.league}:cup);
 drafts[index]=updated;review.hidden=true;renderDrafts();message.textContent='League calendar updated. Save drafts to keep this change.';
 if(settings.inviteBoardId)registrationRequest({action:'update',boardId:settings.inviteBoardId,settings,open:updated.registrationOpen}).then(()=>pageReport('League settings and shared invitation updated.')).catch(error=>pageReport(`Local settings saved; shared invitation was not updated: ${error.message}. Use Teams → Update invite settings before sharing.`));
}
function addSeason(value){
 const name=String(value||'').trim();
 if(!name||name.length>80)throw Error('Enter a season name (up to 80 characters).');
 if([...seasons,...drafts.map(draft=>draft.settings.season)].some(existing=>existing.toLowerCase()===name.toLowerCase()))throw Error('That season already exists.');
 if(seasons.length>=50)throw Error('This preview supports up to 50 season drafts.');
 seasons.push(name);form.elements.season.value=name;renderDrafts();message.textContent='Season created. You can create leagues within it; save drafts to keep it.';
}
function addCompetition(fields){
 fields=validateTeamRules(fields);
 const name=String(fields.name||'').trim();
 if(!name||name.length>80||!['Cup','Playoffs','Other'].includes(fields.type))throw Error('Enter a competition name and type.');
 if(![...seasons,...drafts.map(draft=>draft.settings.season)].includes(fields.season))throw Error('Choose an existing season.');
 if(competitions.length>=100)throw Error('This preview supports up to 100 competitions.');
 if(competitions.some(cup=>cup.season===fields.season&&cup.name.toLowerCase()===name.toLowerCase()))throw Error('That competition name already exists in this season.');
 zonedTimestamp(fields.from,'12:00','America/Chicago');zonedTimestamp(fields.to,'12:00','America/Chicago');
 if(fields.from>fields.to)throw Error('Competition end must be on or after its start.');
 const targets=drafts.map((draft,index)=>({draft,index})).filter(({draft})=>draft.settings.season===fields.season&&(!fields.league||draft.settings.league===fields.league));
 if(fields.pause&&targets.some(({draft})=>draft.acceptedResults?.length))throw Error('Accepted results exist. Do not rebuild this season calendar; export a backup and plan a new draft.');
 if(fields.league&&!targets.length)throw Error('Choose a league in this season.');
 const proposed=fields.pause?targets.map(({draft,index})=>{const settings=settingsFrom({...draft.settings,breaks:[...(draft.settings.breaks||[]),{from:fields.from,to:fields.to,reason:name}]});return {index,draft:draft.scheduleGenerated?buildLeagueSchedule(settings):{...draft,settings}};}):[];
 if(fields.pause&&targets.some(({draft})=>draft.scheduleGenerated)&&!approveCalendarChange(`competition:${JSON.stringify(fields)}`))return;
 if(fields.pause)for(const change of proposed)drafts[change.index]=change.draft;
 competitions.push({...fields,name});renderDrafts();message.textContent='Competition calendar draft added. Cup draws/results are not connected yet. Save drafts to keep it.';
}
form.addEventListener('submit',event=>{event.preventDefault();try{
 const fields=readTeamRuleControls(form);
 const settings=settingsFrom({...fields,size:Number(fields.size),teams:[]});
 if(drafts.length>=20)throw Error('This preview supports up to 20 league drafts.');
 zonedTimestamp(settings.startDate,settings.time,settings.timeZone);
 if(drafts.some(draft=>draft.settings.season.trim().toLowerCase()===settings.season.trim().toLowerCase()&&draft.settings.league.trim().toLowerCase()===settings.league.trim().toLowerCase()))throw Error('That league already exists in this season draft. Use another name.');
 drafts.push(createLeagueDraft(settings));activeLeague=drafts.length-1;activeTab='overview';renderDrafts();persistDrafts();pageReport('League created and saved on this device with zero teams. Set up its tabs now and add teams later.');
 }catch(error){message.textContent=error.message;}});
function draftFile(){return {version:4,seasons,competitions,leagues:drafts.map(draft=>({settings:draft.settings,registrationOpen:draft.registrationOpen,scheduleGenerated:draft.scheduleGenerated,acceptedResults:draft.acceptedResults||[]}))};}
function restoreDrafts(data){
 if(Array.isArray(data))data={version:1,leagues:data};
 if(!data||![1,2,3,4].includes(data.version)||!Array.isArray(data.leagues)||data.leagues.length>20)throw Error('Not a supported UFL draft file.');
 const loaded=data.leagues.map(entry=>{
  const settings=settingsFrom(data.version===1?entry:entry.settings);
  zonedTimestamp(settings.startDate,settings.time,settings.timeZone);
  let validated=createLeagueDraft({...settings,teams:[]});
  for(const team of settings.teams)validated=registerLeagueTeam(validated,team,{restoring:true});
  validated.settings.teams=settings.teams.map(team=>({...team}));
  if(data.version===1||entry.scheduleGenerated)return restoreAcceptedResults(buildLeagueSchedule(validated.settings),entry.acceptedResults||[]);
  return {...validated,registrationOpen:entry.registrationOpen!==false};
 });
 const savedSeasons=data.version>=3?data.seasons:[],savedCups=data.version>=3?data.competitions:[];
 if(!Array.isArray(savedSeasons)||savedSeasons.length>50||savedSeasons.some(name=>typeof name!=='string'||!name.trim()||name.length>80)||!Array.isArray(savedCups)||savedCups.length>100)throw Error('Invalid season or competition drafts.');
 const seasonNames=[...savedSeasons,...loaded.map(draft=>draft.settings.season)];
 for(const cup of savedCups){
  if(!cup||typeof cup.name!=='string'||!cup.name.trim()||cup.name.length>80||!seasonNames.includes(cup.season)||!['Cup','Playoffs','Other'].includes(cup.type)||cup.league&&!loaded.some(draft=>draft.settings.season===cup.season&&draft.settings.league===cup.league))throw Error('Invalid competition draft.');
  zonedTimestamp(cup.from,'12:00','America/Chicago');zonedTimestamp(cup.to,'12:00','America/Chicago');if(cup.from>cup.to)throw Error('Invalid competition dates.');
  // Older calendar-only cups had no playing rules; retain that state rather than inventing a format.
  if(cup.format)Object.assign(cup,validateTeamRules(cup));
 }
 seasons=savedSeasons;competitions=savedCups;return loaded;
}
save.addEventListener('click',()=>{try{localStorage.setItem(KEY,JSON.stringify(draftFile()));message.textContent='Saved on this device only. Download the draft file to share or move to another PC.';}catch{message.textContent='This browser could not save the draft. Download the file instead.';}});
download.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(draftFile(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ufl-league-drafts.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.querySelector('#import-drafts').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>1000000)throw Error('Choose a draft file smaller than 1 MB.');const data=JSON.parse(await file.text());const loaded=restoreDrafts(data);drafts=loaded;renderDrafts();message.textContent='Draft file opened. Nothing was registered or published.';}catch(error){message.textContent=error.message;}finally{event.target.value='';}});
try{const cached=JSON.parse(localStorage.getItem(KEY)||'[]');drafts=restoreDrafts(cached);}catch{/* Leave invalid or older drafts untouched in storage. */}renderDrafts();
async function checkFixture(index,id,button){
 const draft=drafts[index],fixture=draft.fixtures.find(game=>game.id===id);button.disabled=true;review.hidden=false;review.innerHTML='<h2>Checking scheduled matchup…</h2>';
 if(activeLeague!==null)pageHost.querySelector('[data-page-body]').append(review);
 try{const response=await fetch(`/api/ea/clubs/${encodeURIComponent(fixture.home.eaClubId)}/matches`),data=await response.json();if(!response.ok)throw Error(data.error);const result=fixtureCandidates(fixture,data.matches,{timeZone:draft.settings.timeZone,acceptedMatchIds:(draft.acceptedResults||[]).map(r=>r.matchId)}),labels={waiting:'No unused matching result in the scheduled window',review:'One candidate—staff approval required',ambiguous:'Multiple candidates—staff must choose the correct game',unlinked:'Link both EA clubs first'};
 review.innerHTML=`<span class="section-kicker">Result review · Not counted</span><h2>${escape(fixture.home.name)} vs ${escape(fixture.away.name)}</h2><h3>${labels[result.status]}</h3><p>Checks require both EA club IDs and a timestamp from 15 minutes before to 90 minutes after kickoff. Finding a game does not prove it was the official fixture. No goals, standings, or awards are updated by this check.${data.partial?' Some EA feeds were unavailable.':''}</p>${result.candidates.map(game=>`<article><strong>${Object.values(game.clubs).map(club=>`${escape(club.clubName??club.name)} ${escape(club.score??club.goals)}`).join(' vs ')}</strong><p>${escape(new Date(Number(game.timestamp)*1000).toLocaleString())}</p><small>EA game ${escape(game.matchId)} · Pending review</small></article>`).join('')}`;
 review.querySelectorAll('article').forEach((article,i)=>{const controls=document.createElement('div');controls.innerHTML='<label>Confirmed finish<select><option value="">Select after reviewing the game</option><option value="regular">Regular time (3 / 0 points)</option><option value="extraTime">Extra time (2 / 1 points)</option></select></label><button type="button">Accept into this local test league</button><p>Confirm this was the scheduled league game, not a practice/rematch. This is a local preview approval, not a secured official result.</p>';article.append(controls);controls.querySelector('button').onclick=()=>{try{drafts[index]=acceptFixtureResult(drafts[index],id,result.candidates[i],controls.querySelector('select').value);persistDrafts();review.hidden=true;renderDrafts();pageReport('Scheduled result accepted locally. Only accepted fixtures feed this draft’s table, player totals and TOTW candidates.');}catch(error){pageReport(error.message);}};});
 }catch(error){review.innerHTML=`<h2>Could not check EA</h2><p>${escape(error.message)}</p>`;}finally{button.disabled=false;}
}
