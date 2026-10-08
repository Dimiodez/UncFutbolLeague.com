import {LEAGUE_TABS,setPagePublished} from './league-page-model.js';
import {renderSectionTools,renderTeamManagement} from './league-editors.js';
import {registrationAllowed} from './league-engine.js';
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const empty={rules:'League rules have not been added yet.',videos:'No videos added yet.',players:'No players registered yet. Shared player registration and roster management will be connected before launch.',finals:'No finals configured yet. Brackets and qualification are not connected.',stats:'No accepted results yet. Player and team statistics will come from accepted league fixtures only; automatic ingestion is not connected.',standings:'No accepted results yet. Standings calculations and official corrections are not connected.',awards:'No Team of the Week selected yet. Formation, candidate selection and award publishing are still to come.'};

export function renderLeaguePage({host,card,draft,index,tab,onTab,onClose,onSettings,onSave,onTeamEdit,onTeamRemove,onReport}){
 const settings=draft.settings,content=settings.pageContent?.[tab]||{};
 host.hidden=false;
 host.innerHTML=`<div class="workshop-toolbar"><button type="button" data-back>← All leagues & seasons</button><button type="button" data-publication>${settings.pagePublished?'Unpublish preview page':'Publish preview page'}</button></div><header class="league-page-hero"><span class="section-kicker">${escape(settings.season)} · ${escape(settings.format)}</span><h1>${escape(settings.league)}</h1><p>${settings.teams.length} teams · ${settings.size} per side · roster max ${settings.maxTeamSize} · keepers ${settings.keepersEnabled?'enabled':'disabled'}</p><p>${registrationAllowed(draft)?'Registration open':draft.registrationOpen?'Outside registration window':'Registration closed'} · ${settings.pagePublished?'Preview page published on this device':'Unpublished preview page'}</p></header><p class="workshop-boundary">Owner/admin screen preview — controls below edit local drafts, not secured shared records. Publishing here saves this device’s preview only, with or without teams. It does not create a public registration link.</p><div role="tablist" aria-label="League sections" class="league-page-tabs">${LEAGUE_TABS.map(([key,label])=>`<button type="button" id="league-tab-${key}" role="tab" aria-selected="${key===tab}" aria-controls="league-tab-panel" tabindex="${key===tab?0:-1}" data-tab="${key}">${label}</button>`).join('')}</div><section id="league-tab-panel" role="tabpanel" aria-labelledby="league-tab-${tab}" class="card league-page-panel"><h2>${LEAGUE_TABS.find(([key])=>key===tab)[1]}</h2><div data-page-body></div><div data-page-admin></div></section><p role="status" aria-live="polite" data-page-status></p>`;
 host.querySelector('[data-back]').onclick=onClose;
 const save=document.createElement('button');save.type='button';save.textContent='Save all changes on this device';save.onclick=()=>{try{onSave();}catch(error){onReport(`Could not save: ${error.message}`);}};host.querySelector('.workshop-toolbar').append(save);
 host.querySelector('[data-publication]').onclick=()=>{try{onSettings(setPagePublished(settings,!settings.pagePublished));onReport('Preview publication saved on this device. Shared/public publishing is not connected yet.');}catch(error){onReport(error.message);}};
 host.querySelectorAll('[data-tab]').forEach(button=>{
  button.onclick=()=>onTab(button.dataset.tab);
  button.onkeydown=event=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const current=LEAGUE_TABS.findIndex(([key])=>key===tab),next=event.key==='Home'?0:event.key==='End'?LEAGUE_TABS.length-1:(current+(event.key==='ArrowRight'?1:-1)+LEAGUE_TABS.length)%LEAGUE_TABS.length;onTab(LEAGUE_TABS[next][0]);host.querySelector(`[data-tab="${LEAGUE_TABS[next][0]}"]`).focus();};
 });
 const body=host.querySelector('[data-page-body]'),admin=host.querySelector('[data-page-admin]');
 const note=text=>{const p=document.createElement('p');p.className='league-page-text';p.textContent=text;body.append(p);};
 if(content.text)note(content.text);
 else if(tab==='rules'&&content.items?.length||tab==='videos'&&(content.videos?.length||content.links?.length)){} // Collection cards below replace the empty state.
 else if(tab==='finals'&&content.format)note(content.format==='none'?'Finals are disabled for this league.':'Finals settings saved. Bracket generation and automatic qualification are not connected yet.');
 else if(tab==='awards'&&content.formation)note('Formation and eligibility settings saved. No lineup selected yet; candidate selection and award publishing are not connected.');
 else if(empty[tab])note(empty[tab]);
 if(tab==='overview'){
  if(!content.text)note('Your league page is ready before any teams register. Set the rules and calendar now; add teams later.');
  note(`First eligible matchnight: ${settings.startDate} · ${settings.time} (${settings.timeZone}) · every ${settings.repeatWeeks||1} week(s).`);
  const controls=card.querySelector('.workshop-settings');if(controls){controls.open=false;admin.append(controls);}
 }
 if(tab==='teams'){
  body.append(card.querySelector('.workshop-registration'));
  renderTeamManagement({host,admin,draft,onTeamEdit,onTeamRemove,onReport});
 }
 if(tab==='matches'){
  if(!draft.scheduleGenerated)note('No fixtures yet. Add teams in Teams, close registration, then generate the schedule. The league page does not require fixtures to be published.');
  const windows=card.querySelector('.workshop-windows');if(windows)admin.append(windows);
  card.querySelectorAll(':scope > details:not(.workshop-settings)').forEach(night=>body.append(night));
  const calendar=card.querySelector('.workshop-settings');if(calendar)admin.append(calendar);
  if(draft.scheduleGenerated)note('EA candidate checks find scheduled opponents in the kickoff window. Candidates are not official results until an acceptance workflow is connected.');
 }
 if(tab==='videos')for(const video of (content.videos||(content.links||[]).map((url,index)=>({title:`Video ${index+1}`,url})))){const p=document.createElement('p'),a=document.createElement('a');p.className='video-card';a.href=video.url;a.textContent=video.title;a.target='_blank';a.rel='noopener noreferrer';p.append(a);body.append(p);}
 if(tab==='standings'){
  note(`Points policy: win ${content.win??3} · draw ${content.draw??1} · loss ${content.loss??0}. Policy only — not calculating results yet.`);
  if(settings.teams.length){const table=document.createElement('table');table.innerHTML=`<caption>Registered teams — unranked, no results counted</caption><thead><tr><th>Team</th><th>Played</th><th>Points</th></tr></thead><tbody>${settings.teams.map(team=>`<tr><td>${escape(team.name)}</td><td>—</td><td>—</td></tr>`).join('')}</tbody>`;body.append(table);}
 }
 renderSectionTools({host,admin,body,tab,settings,onSettings,onReport});
}
