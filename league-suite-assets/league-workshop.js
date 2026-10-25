import {createLeagueDraft,registerLeagueTeam,buildLeagueSchedule,fixtureCandidates,zonedTimestamp,validateScheduleSettings,validateTeamRules,registrationAllowed,upgradeDraftByePolicy} from './league-engine.js?v=20261021-calendar1';
import {mergeSharedTestDraft} from './league-va-schedule.js';
import {EA_TRIAL_ID,upgradeTrialClubIds,eaTrialSettings} from './league-ea-trial.js?v=20261016-arsenal1';
import {EA_TEN_TRIAL_ID,eaTenTrialSettings} from './league-ea-ten-trial.js';
import {validWorkshopTeamId} from './league-team-identity.js';
import {acceptPendingResult,restorePendingResults} from './league-pending-results.js';
import {bindTeamRuleControls,readTeamRuleControls} from './team-rule-controls.js';
import {bindMatchnightControls} from './league-matchnight-controls.js';
import {renderAdministration} from './league-administration.js';
import {renderLeaguePage} from './league-page.js?v=20261021-review3';
import {editDraftTeam,removeDraftTeam,updatePageSettings} from './league-page-model.js';
import {acceptFixtureResult,restoreAcceptedResults} from './league-results.js?v=20261016-suite1';
import {importAutomaticTrial} from './league-ea-auto.js?v=20261016-suite1';
import {enhanceLeagueWorkshop} from './league-workshop-ux.js?v=20261016-layout2';
import {registrationRequest} from './league-registration-invites.js';
import {installWorkshopBrand} from './league-workshop-brand.js';
import {watchUnsaved} from './league-workspace-status.js';
import {installAccountDrafts} from './league-account-drafts.js';
import {installEaTestLab} from './league-ea-test.js?v=20261015-ux1';
import {correctFixture,applyConfirmedTrialCorrection} from './league-result-corrections.js';
const uxStyle=document.createElement('link');uxStyle.rel='stylesheet';uxStyle.href='/league-suite-assets/league-workshop-ux.css?v=20261016-layout2';document.head.append(uxStyle);
installWorkshopBrand();
installEaTestLab();
const markLocalSaved=watchUnsaved(document.querySelector('main.workshop'));
const form=document.querySelector('#league-builder'),message=document.querySelector('#workshop-message'),root=document.querySelector('#league-drafts'),review=document.querySelector('#candidate-review'),save=document.querySelector('#save-drafts'),download=document.querySelector('#export-drafts');
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const KEY='ufl-v2-workshop-drafts-v1';let drafts=[],seasons=[],competitions=[];
const sharedLeagues=new Map();let syncingShared=false;
let draftStorageReadable=true;
let activeLeague=null,activeTab='overview',migratedByeCount=0;
const pageHost=document.createElement('section');pageHost.className='league-page';pageHost.hidden=true;
document.querySelector('.workshop-layout').before(message,pageHost);
let accountDrafts;
function persistDrafts(){localStorage.setItem(KEY,JSON.stringify(draftFile()));markLocalSaved('Saved on this device');accountDrafts?.changed();}
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
bindMatchnightControls(form);
form.elements.format.addEventListener('change',()=>{if(form.elements.format.value!=='Custom'){form.elements.weekday.value=form.elements.format.value==='10v10'?'2':'4';form.elements.weekday.dispatchEvent(new Event('change'));}});
function settingsFrom(values){
 if(values?.inviteBoardId!==undefined&&(typeof values.inviteBoardId!=='string'||!/^[A-Za-z0-9_-]{24}$/.test(values.inviteBoardId)))throw Error('Invalid shared registration board.');
 if(values?.managerInviteUrl!==undefined&&(typeof values.managerInviteUrl!=='string'||!/^https:\/\/(?:[a-zA-Z0-9-]+\.)?ufl-major-update-preview\.pages\.dev\/league-join\.html#[A-Za-z0-9_-]{43}$/.test(values.managerInviteUrl)))throw Error('Invalid preview registration invitation URL.');
 if(!values||typeof values.season!=='string'||typeof values.league!=='string'||!values.season.trim()||!values.league.trim()||values.season.length>80||values.league.length>80)throw Error('Enter a season and league name.');
 if(!Array.isArray(values.teams)||values.teams.some(team=>!team.name?.trim()||team.name.length>80||!validWorkshopTeamId(team.id,values.trialSchedule)||team.eaClubId&&!/^\d{1,20}$/.test(team.eaClubId)))throw Error('Use valid team names and numeric EA club IDs.');
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
 return validateScheduleSettings({...values,byePolicyRevision:2});
}
function renderDrafts({sectionOnly=false}={}){
 pendingCalendarChange=null;
 if(!sectionOnly){
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
 }
 if(activeLeague!==null&&!drafts[activeLeague])activeLeague=null;
 document.querySelector('.workshop-layout').hidden=activeLeague!==null;
 document.querySelector('#league-overview').hidden=activeLeague!==null;
 pageHost.hidden=activeLeague===null;
 if(activeLeague!==null){
  const index=activeLeague;
  renderLeaguePage({host:pageHost,card:root.querySelector(`#league-${index}`),draft:drafts[index],allDrafts:drafts,index,tab:activeTab,
   onTab:tab=>{if(tab===activeTab)return;activeTab=tab;renderDrafts({sectionOnly:true});const panel=pageHost.querySelector('[role="tabpanel"]');panel.scrollIntoView({block:'start'});const selected=pageHost.querySelector(`[data-tab="${tab}"]`);selected.scrollIntoView({block:'nearest',inline:'nearest'});selected.focus({preventScroll:true});},onClose:()=>{activeLeague=null;renderDrafts();document.querySelector('.league-library-heading').scrollIntoView({block:'start'});document.querySelector('[data-new-league]').focus({preventScroll:true});},
   onSettings:settings=>{updateLeague(index,settings);persistDrafts();},
   onCorrect:async(fixtureId,values,destination)=>{if(destination==='online'){const id=drafts[index].settings.serverLeagueId||drafts[index].settings.trialSchedule,row=sharedLeagues.get(id);if(!row)throw Error('Enable shared collection for this league first.');const response=await fetch('/api/league-suite/league-results',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,revision:row.revision,fixtureId,values,...(values.acceptPending?{operation:'accept-pending',matchId:values.eaMatchId}:{})})}),data=await response.json();if(!response.ok)throw Error(data.error);await syncSharedResults(true);pageReport('Correction saved online. Future EA checks will not overwrite it.');}else{drafts[index]=values.acceptPending?acceptPendingResult(drafts[index],fixtureId,values.eaMatchId,values):correctFixture(drafts[index],fixtureId,values);drafts[index].acceptedResults.find(r=>r.fixtureId===fixtureId).correction.localOnly=true;persistDrafts();renderDrafts();pageReport('Correction saved on this device only. EA data retained; totals recalculated.');}},
   onRegisterCollection:async()=>{try{const id=drafts[index].settings.serverLeagueId||drafts[index].settings.trialSchedule||crypto.randomUUID(),response=await fetch('/api/league-suite/league-results',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:'register',id,draft:{settings:{...drafts[index].settings,serverLeagueId:id,collectionEnabled:true},acceptedResults:drafts[index].acceptedResults||[]}})}),data=await response.json();if(!response.ok)throw Error(data.error);drafts[index].settings.serverLeagueId=id;drafts[index].settings.collectionEnabled=true;persistDrafts();await syncSharedResults();pageReport('Shared server collection enabled. Browser can be closed.');}catch(error){pageReport(error.message);}},
   onSave:()=>{persistDrafts();pageReport('All league drafts saved on this device. Use Save drafts online above to continue on mobile or another PC.');},
   onTeamEdit:(id,values)=>{drafts[index]=editDraftTeam(drafts[index],id,values);renderDrafts();persistDrafts();pageReport('Team changes saved on this device.');},
   onImportTeam:(team,{checkOnly=false}={})=>{
    const existing=drafts[index].settings.teams.find(t=>t.remoteTeamId===team.id);
    let next=existing?editDraftTeam(drafts[index],existing.id,{name:team.name,eaClubId:team.ea_id}):registerLeagueTeam(drafts[index],{name:team.name,eaClubId:team.ea_id});
    if(checkOnly)return;
    const added=existing?next.settings.teams.find(t=>t.id===existing.id):next.settings.teams.at(-1);added.remoteTeamId=team.id;added.managerDiscordId=team.manager_id;added.inGameName=team.in_game_name||'';
    drafts[index]=next;persistDrafts();renderDrafts();
   },
   onTeamRemove:id=>{drafts[index]=removeDraftTeam(drafts[index],id);renderDrafts();persistDrafts();pageReport('Team removed from this draft league only. No live data was changed. Restore an exported draft backup to recover it.');},onReport:pageReport});
 }
 enhanceLeagueWorkshop({drafts,activeLeague,activeTab,pageHost,sectionOnly});
 showCollectorHealth();
}
function updateLeague(index,values){
 const settings=settingsFrom(values),draft=drafts[index];
 if(drafts.some((other,otherIndex)=>otherIndex!==index&&other.settings.season.trim().toLowerCase()===settings.season.trim().toLowerCase()&&other.settings.league.trim().toLowerCase()===settings.league.trim().toLowerCase()))throw Error('That league already exists in this season.');
 const calendarKey=value=>JSON.stringify([value.startDate,value.weekday,Number(value.matchnightCount??1),Number(value.matchnightCount??1)===2?Number(value.secondWeekday):null,value.time,value.timeZone,value.spacingMinutes,value.repeatWeeks,value.byePolicy??'split',value.breaks,(value.windows||[]).filter(window=>['bye','holiday','cup','break'].includes(window.type))]);
 const calendarChanged=calendarKey(settings)!==calendarKey(draft.settings);
 if(calendarChanged&&draft.acceptedResults?.length)throw Error('Accepted test results exist. Export a backup and create a new league draft instead of rebuilding its fixtures.');
 if(settings.trialSchedule){for(const result of draft.acceptedResults||[]){const f=draft.fixtures.find(x=>x.id===result.fixtureId);for(const t of [f.home,f.away])if(settings.teams.find(x=>x.id===t.id)?.eaClubId!==t.eaClubId)throw Error('Cannot change a club ID already used by an accepted result.');}}
 const updated=settings.trialSchedule?{...buildLeagueSchedule(settings),acceptedResults:draft.acceptedResults||[]}:draft.scheduleGenerated&&calendarChanged?buildLeagueSchedule(settings):{...draft,settings};
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
function draftFile(){return {version:4,seasons,competitions,leagues:drafts.map(draft=>({settings:draft.settings,registrationOpen:draft.registrationOpen,scheduleGenerated:draft.scheduleGenerated,acceptedResults:draft.acceptedResults||[],pendingResults:draft.pendingResults||[]}))};}
function restoreDrafts(data){
 migratedByeCount=0;
 if(Array.isArray(data))data={version:1,leagues:data};
 if(!data||![1,2,3,4].includes(data.version)||!Array.isArray(data.leagues)||data.leagues.length>20)throw Error('Not a supported UFL draft file.');
 const loaded=data.leagues.map(entry=>{
  const original=data.version===1?entry:entry.settings;
  const upgraded=upgradeDraftByePolicy(original,entry.acceptedResults||[]);
  if(upgraded.byePolicy==='fullNight'&&original.byePolicy!=='fullNight'&&original.teams?.length%2===1&&original.teams.length>=5)migratedByeCount++;
  const settings=settingsFrom(upgraded);
  if(settings.trialSchedule===EA_TRIAL_ID)settings.teams=upgradeTrialClubIds(settings.teams,entry.acceptedResults||[]);
  zonedTimestamp(settings.startDate,settings.time,settings.timeZone);
  let validated=createLeagueDraft({...settings,teams:[]});
  for(const team of settings.teams)validated=registerLeagueTeam(validated,team,{restoring:true});
  validated.settings.teams=settings.teams.map(team=>({...team}));
  if(data.version===1||entry.scheduleGenerated)return restorePendingResults(restoreAcceptedResults(buildLeagueSchedule(validated.settings),entry.acceptedResults||[]),entry.pendingResults||[]);
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
save.addEventListener('click',()=>{try{persistDrafts();message.textContent='Saved on this device. Use Save drafts online to keep a copy in your Discord account.';}catch{message.textContent='This browser could not save the draft. Download the file instead.';}});
download.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(draftFile(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ufl-league-drafts.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.querySelector('#import-drafts').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>1000000)throw Error('Choose a draft file smaller than 1 MB.');const data=JSON.parse(await file.text());const loaded=restoreDrafts(data);drafts=loaded;renderDrafts();message.textContent='Draft file opened. Nothing was registered or published.';}catch(error){message.textContent=error.message;}finally{event.target.value='';}});
try{
 const previous=localStorage.getItem(KEY)||'[]';drafts=restoreDrafts(JSON.parse(previous));
 if(migratedByeCount){localStorage.setItem(KEY+'-before-full-night-byes',previous);persistDrafts();message.textContent=`Corrected ${migratedByeCount} odd-team draft(s) to full-night byes. Existing results were not changed. A pre-update backup is saved on this device.`;}
}catch{draftStorageReadable=false;/* Leave invalid or older drafts untouched in storage. */}
// Add the explicitly requested parallel trial without replacing existing drafts.
if(draftStorageReadable&&!drafts.some(d=>d.settings.trialSchedule===EA_TRIAL_ID)&&drafts.length<20){
 drafts.push(buildLeagueSchedule(eaTrialSettings()));
 // Do not overwrite an unreadable existing draft backup.
 try{const previous=localStorage.getItem(KEY);if(previous)localStorage.setItem(KEY+'-before-ea-trial',previous);persistDrafts();}catch{message.textContent='EA trial loaded but could not be saved on this browser.';}
}
drafts=drafts.map(applyConfirmedTrialCorrection);
if(draftStorageReadable&&!drafts.some(d=>d.settings.trialSchedule===EA_TEN_TRIAL_ID)&&drafts.length<20){drafts.push(buildLeagueSchedule(eaTenTrialSettings()));try{persistDrafts();}catch{message.textContent='10v10 test loaded; browser save unavailable.';}}
renderDrafts();
accountDrafts=installAccountDrafts({getData:draftFile,saveLocal:persistDrafts,
 hasUnappliedChanges:()=>!!document.querySelector('form[data-unsaved="true"]'),
 onSaved:()=>markLocalSaved('Saved online · Discord account'),
 loadData:data=>{
  const before=draftFile(),oldSeasons=seasons,oldCompetitions=competitions;
  let loaded;try{loaded=restoreDrafts(data);}catch(error){seasons=oldSeasons;competitions=oldCompetitions;throw error;}
  const nextSeasons=seasons,nextCompetitions=competitions;seasons=oldSeasons;competitions=oldCompetitions;
  localStorage.setItem(KEY+'-before-account-open',JSON.stringify(before));
  localStorage.setItem(KEY,JSON.stringify(data));
  seasons=nextSeasons;competitions=nextCompetitions;
  document.querySelector('[data-close-create]')?.click();form.reset();delete form.dataset.unsaved;
  drafts=loaded;activeLeague=null;review.hidden=true;renderDrafts();pageHost.replaceChildren();
 },recoverLocal:()=>{
  const backup=localStorage.getItem(KEY+'-before-account-open');if(!backup)throw Error('No browser backup from an account opening is available on this device yet.');
  const loaded=restoreDrafts(JSON.parse(backup));drafts=loaded;activeLeague=null;review.hidden=true;persistDrafts();renderDrafts();
 }});
document.querySelector('.workspace-advanced').before(document.querySelector('.account-drafts'));
async function checkFixture(index,id,button){
 const draft=drafts[index],fixture=draft.fixtures.find(game=>game.id===id);button.disabled=true;review.hidden=false;review.innerHTML='<h2>Checking scheduled matchup…</h2>';
 if(activeLeague!==null)pageHost.querySelector('[data-page-body]').append(review);
 try{const response=await fetch(`/api/league-suite/ea/clubs/${encodeURIComponent(fixture.home.eaClubId)}/matches`),data=await response.json();if(!response.ok)throw Error(data.error);const result=fixtureCandidates(fixture,data.matches,{timeZone:draft.settings.timeZone,acceptedMatchIds:(draft.acceptedResults||[]).map(r=>r.matchId)}),labels={waiting:'No unused matching result in the scheduled window',review:'One candidate—staff approval required',ambiguous:'Multiple candidates—staff must choose the correct game',unlinked:'Link both EA clubs first'};
 review.innerHTML=`<span class="section-kicker">Result review · Not counted</span><h2>${escape(fixture.home.name)} vs ${escape(fixture.away.name)}</h2><h3>${labels[result.status]}</h3><p>Checks require both EA club IDs and a timestamp from 15 minutes before to 90 minutes after kickoff. Finding a game does not prove it was the official fixture. No goals, standings, or awards are updated by this check.${data.partial?' Some EA feeds were unavailable.':''}</p>${result.candidates.map(game=>`<article><strong>${Object.values(game.clubs).map(club=>`${escape(club.clubName??club.name)} ${escape(club.score??club.goals)}`).join(' vs ')}</strong><p>${escape(new Date(Number(game.timestamp)*1000).toLocaleString())}</p><small>EA game ${escape(game.matchId)} · Pending review</small></article>`).join('')}`;
 review.querySelectorAll('article').forEach((article,i)=>{const controls=document.createElement('div');controls.innerHTML='<label>Confirmed finish<select><option value="">Select after reviewing the game</option><option value="regular">Regular time (3 / 0 points)</option><option value="extraTime">Extra time (2 / 1 points)</option></select></label><button type="button">Accept into this local test league</button><p>Confirm this was the scheduled league game, not a practice/rematch. This is a local preview approval, not a secured official result.</p>';article.append(controls);controls.querySelector('button').onclick=()=>{try{drafts[index]=acceptFixtureResult(drafts[index],id,result.candidates[i],controls.querySelector('select').value);persistDrafts();review.hidden=true;renderDrafts();pageReport('Scheduled result accepted locally. Only accepted fixtures feed this draft’s table, player totals and TOTW candidates.');}catch(error){pageReport(error.message);}};});
 }catch(error){review.innerHTML=`<h2>Could not check EA</h2><p>${escape(error.message)}</p>`;}finally{button.disabled=false;}
}

let automaticTrialBusy=false;
async function checkAutomaticTrials(){
 if(automaticTrialBusy)return;
 const trials=drafts.filter(d=>d.settings.trialSchedule===EA_TRIAL_ID);
 if(!trials.length)return;automaticTrialBusy=true;
 const notes=[];let total=0,updated=0;
 try{
  for(const original of trials){
   try{const response=await fetch('/league-suite-assets/ea-trial-recovery-20261015.json',{cache:'no-store'});if(!response.ok)throw Error('Archive unavailable');const archive=await response.json();if(archive.trialSchedule!==EA_TRIAL_ID||!Array.isArray(archive.matches))throw Error('Invalid archive');const index=drafts.indexOf(original);if(index>=0){const recovered=importAutomaticTrial(drafts[index],archive.matches);drafts[index]=recovered.draft;total+=recovered.added;updated+=recovered.updated;notes.push(...recovered.warnings);if(recovered.added||recovered.updated){persistDrafts();renderDrafts();}}}catch{notes.push('Recovery snapshot unavailable; checking EA history.');}
   const current=drafts.find(d=>d.settings.trialSchedule===original.settings.trialSchedule);if(!current)continue;
   const due=current.fixtures.filter(f=>f.startsAt<=Date.now()&&f.home.eaClubId&&f.away.eaClubId&&!(current.acceptedResults||[]).some(r=>r.fixtureId===f.id));
   if(!due.length){notes.push('Waiting for linked scheduled fixtures to be played.');continue;}
   const ids=[...new Set(due.flatMap(f=>[f.home.eaClubId,f.away.eaClubId]))],games=[];
   for(const id of ids){try{const r=await fetch(`/api/league-suite/ea/clubs/${id}/matches`,{cache:'no-store',signal:AbortSignal.timeout(30000)}),data=await r.json();if(!r.ok||!Array.isArray(data.matches))throw Error(data.error||'Invalid response');games.push(...data.matches);if(data.partial)notes.push(`Club ${id}: ${(data.feeds||[]).filter(f=>!f.available).map(f=>f.type).join(', ')||'some match types'} unavailable. Missing results are not counted as losses.`);}catch{notes.push(`Club ${id}: EA unavailable; retrying next check.`);}}
   // A user may edit another league while network calls run; never replace it.
   const index=drafts.indexOf(current);if(index<0)continue;
   const imported=importAutomaticTrial(drafts[index],games);drafts[index]=imported.draft;total+=imported.added;updated+=imported.updated;notes.push(...imported.warnings);
  }
  if(total||updated){persistDrafts();renderDrafts();}
  const text=`Auto EA check ${new Date().toLocaleTimeString()}: ${total} new scheduled result(s), ${updated} player-stat update(s). ${notes.join(' ')} Next check in 5 minutes while this page remains open.`;
  const el=document.querySelector('[data-auto-trial-status]');if(el)el.textContent=text;
 }catch(error){pageReport(`Automatic EA trial: ${error.message}. Keep this page open to retry. Check saved state before closing.`);}
 finally{automaticTrialBusy=false;}
}
setInterval(checkAutomaticTrials,5*60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkAutomaticTrials();});
checkAutomaticTrials();
async function syncSharedResults(force=false){
 if(syncingShared||(!force&&document.querySelector('form[data-unsaved="true"]')))return;syncingShared=true;
 try{const response=await fetch('/api/league-suite/league-results',{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error);let changed=false;
  for(const row of data.leagues||[]){sharedLeagues.set(row.id,row);const index=drafts.findIndex(d=>(d.settings.serverLeagueId||d.settings.trialSchedule)===row.id);if(index<0)continue;const local=drafts[index],updated=mergeSharedTestDraft(local,row.draft);if(JSON.stringify(updated.acceptedResults)!==JSON.stringify(local.acceptedResults)||JSON.stringify(updated.pendingResults)!==JSON.stringify(local.pendingResults||[])||JSON.stringify(updated.settings.vaSchedule)!==JSON.stringify(local.settings.vaSchedule)){drafts[index]=updated;changed=true;}}
  if(changed){persistDrafts();renderDrafts();}showCollectorHealth();
 }catch(error){const status=document.querySelector('[data-collector-health]');if(status)status.textContent=`Shared collector status unavailable: ${error.message}. Browser draft retained.`;}finally{syncingShared=false;}
}
function showCollectorHealth(){
 const draft=activeLeague===null?null:drafts[activeLeague],id=draft?.settings.serverLeagueId||draft?.settings.trialSchedule,row=sharedLeagues.get(id);
 document.querySelector('[data-collector-health]')?.remove();if(!row||pageHost.hidden)return;
 pageHost.querySelectorAll('.league-tracking-summary').forEach(el=>el.remove());
 const status=document.createElement('section');status.dataset.collectorHealth='';status.className='league-tracking-summary';status.setAttribute('role','status');
 const label=document.createElement('strong');label.textContent=`Server collector · every 5 minutes · ${row.health?.upstreamStatus==='failed'?'Friendly feed failed — attention required':row.health?.mode==='catchup'?'Recovering missed games':row.health?.polling?'Polling active':'Outside scheduled match window'}`;
 const detail=document.createElement('p');detail.textContent=`Last scheduler check: ${row.checked_at?row.checked_at+' UTC':'awaiting first cron'} · Last EA attempt: ${row.health?.lastEAcheck||'not attempted'} · Last successful friendly check: ${row.health?.lastEAsuccess||'not verified'} · Revision ${row.revision}.`;
 const schedule=document.createElement('p');schedule.textContent='Live EA checks run from 15 minutes before the first kickoff until 90 minutes after it. Missed fixtures are retried every 30 minutes for seven days. Pending reviews do not count until accepted.';
 const health=document.createElement('p');health.textContent=row.health?.error||row.health?.warnings?.join(' ')||'No collection errors recorded.';
 const disclosure=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Collection status & diagnostics';disclosure.append(summary,detail,schedule,health);status.append(label);
 const diagnostics=document.createElement('button');diagnostics.type='button';diagnostics.textContent='Recent collection runs';
 diagnostics.addEventListener('click',async()=>{diagnostics.disabled=true;try{const response=await fetch(`/api/league-suite/league-results?diagnostics=${encodeURIComponent(id)}`,{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error);const output=document.createElement('div');for(const run of data.runs||[]){const line=document.createElement('p');line.textContent=`${run.checked_at} · ${run.mode} · ${run.status} · ${run.diagnostics.added||0} added · ${run.diagnostics.pending||0} pending${run.diagnostics.error?' · '+run.diagnostics.error:''}`;output.append(line);}disclosure.append(output);}catch(error){const line=document.createElement('p');line.textContent=error.message;disclosure.append(line);diagnostics.disabled=false;}});disclosure.append(diagnostics);
 if(draft.settings.vaSchedule){const calendar=document.createElement('p'),next=draft.fixtures.find(f=>f.startsAt>=Date.now());calendar.textContent=`Full VA calendar · ${draft.fixtures.length} fixtures · refreshes automatically every 6 hours. ${next?'Next kickoff: '+new Date(next.startsAt).toLocaleString('en-US',{timeZone:draft.settings.timeZone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'No remaining fixtures.'}`;status.append(calendar);}
 status.append(disclosure);pageHost.querySelector('.league-page-hero').append(status);
}
setInterval(syncSharedResults,60000);syncSharedResults();

import {installSuiteAccessControls} from './league-suite-access.js';installSuiteAccessControls();
