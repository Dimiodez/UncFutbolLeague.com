import {LEAGUE_TABS as SITE_LEAGUE_TABS,setPagePublished} from './league-page-model.js';
import {renderSectionTools,renderTeamManagement} from './league-editors.js';
import {renderAwardsWorkbench} from './league-awards.js';
import {registrationAllowed} from './league-engine.js';
import {acceptedAppearances,leagueStandings} from './league-results.js';
import {renderSeasonCalendar} from './league-season-tools.js';
import {renderCupPlanner} from './league-cup-planner.js';
import {renderRegistrationInvites} from './league-registration-invites.js';
const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// Derived public data pages are not separate league-configuration tasks.
const LEAGUE_TABS=SITE_LEAGUE_TABS.filter(([key])=>!['stats','standings'].includes(key));
const empty={rules:'League rules have not been added yet.',videos:'No videos added yet.',players:'No players registered yet. Shared player registration and roster management will be connected before launch.',finals:'No finals configured yet. Brackets and qualification are not connected.',stats:'No accepted results yet. Player and team statistics will come from accepted league fixtures only; automatic ingestion is not connected.',standings:'No accepted results yet. Standings calculations and official corrections are not connected.',awards:'No Team of the Week selected yet. Formation, candidate selection and award publishing are still to come.'};

export function renderLeaguePage({host,card,draft,allDrafts=[],index,tab,onTab,onClose,onSettings,onSave,onTeamEdit,onTeamRemove,onImportTeam,onReport}){
 const settings=draft.settings,content=settings.pageContent?.[tab]||{};
 let awardController=null;
 const guard=action=>{
  if(!awardController?.hasUnsavedChanges()){action();return;}
  const notice=host.querySelector('[data-page-status]');notice.textContent='Award selection has unsaved changes. Save it first, or discard to continue. ';
  const discard=document.createElement('button');discard.type='button';discard.textContent='Discard selection changes & continue';discard.onclick=action;
  const stay=document.createElement('button');stay.type='button';stay.textContent='Keep editing';stay.onclick=()=>notice.replaceChildren();notice.append(discard,stay);
 };
 host.hidden=false;
 host.innerHTML=`<div class="workshop-toolbar"><button type="button" data-back>← All leagues & seasons</button><button type="button" data-publication>${settings.pagePublished?'Unpublish preview page':'Publish preview page'}</button></div><header class="league-page-hero"><span class="section-kicker">${escape(settings.season)} · ${escape(settings.format)}</span><h1>${escape(settings.league)}</h1><p>${settings.teams.length} teams · ${settings.size} per side · roster max ${settings.maxTeamSize} · keepers ${settings.keepersEnabled?'enabled':'disabled'}</p><p>${registrationAllowed(draft)?'Registration open':draft.registrationOpen?'Outside registration window':'Registration closed'} · ${settings.pagePublished?'Preview page published on this device':'Unpublished preview page'}</p></header><p class="workshop-boundary">Owner/admin screen preview — controls below edit local drafts, not secured shared records. Publishing here saves this device’s preview only, with or without teams. It does not create a public registration link.</p><div role="tablist" aria-label="League sections" class="league-page-tabs">${LEAGUE_TABS.map(([key,label])=>`<button type="button" id="league-tab-${key}" role="tab" aria-selected="${key===tab}" aria-controls="league-tab-panel" tabindex="${key===tab?0:-1}" data-tab="${key}">${label}</button>`).join('')}</div><section id="league-tab-panel" role="tabpanel" aria-labelledby="league-tab-${tab}" class="card league-page-panel"><h2>${LEAGUE_TABS.find(([key])=>key===tab)[1]}</h2><div data-page-body></div><div data-page-admin></div></section><p role="status" aria-live="polite" data-page-status></p>`;
 host.querySelector('[data-back]').onclick=()=>guard(onClose);
 const save=document.createElement('button');save.type='button';save.textContent='Save all changes on this device';save.onclick=()=>{try{onSave();}catch(error){onReport(`Could not save: ${error.message}`);}};host.querySelector('.workshop-toolbar').append(save);
 host.querySelector('[data-publication]').onclick=()=>guard(()=>{try{onSettings(setPagePublished(settings,!settings.pagePublished));onReport('Preview publication saved on this device. Shared/public publishing is not connected yet.');}catch(error){onReport(error.message);}});
 host.querySelectorAll('[data-tab]').forEach(button=>{
  button.onclick=()=>guard(()=>onTab(button.dataset.tab));
  button.onkeydown=event=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const current=LEAGUE_TABS.findIndex(([key])=>key===tab),next=event.key==='Home'?0:event.key==='End'?LEAGUE_TABS.length-1:(current+(event.key==='ArrowRight'?1:-1)+LEAGUE_TABS.length)%LEAGUE_TABS.length;guard(()=>{onTab(LEAGUE_TABS[next][0]);host.querySelector(`[data-tab="${LEAGUE_TABS[next][0]}"]`).focus();});};
 });
 const body=host.querySelector('[data-page-body]'),admin=host.querySelector('[data-page-admin]');
 const note=text=>{const p=document.createElement('p');p.className='league-page-text';p.textContent=text;body.append(p);};
 if(tab==='awards'){
  awardController=renderAwardsWorkbench({host:body,draft,onSettings,records:acceptedAppearances(draft)});
  return;
 }
 if(content.text)note(content.text);
 else if(tab==='rules'&&content.items?.length||tab==='videos'&&(content.videos?.length||content.links?.length)){} // Collection cards below replace the empty state.
 else if(tab==='finals'&&content.format)note(content.format==='none'?'Finals are disabled for this league.':'Finals settings saved. Bracket generation and automatic qualification are not connected yet.');
 else if(tab==='awards'&&content.formation)note('Formation and eligibility settings saved. No lineup selected yet; candidate selection and award publishing are not connected.');
 else if(empty[tab]&&!(['stats','standings'].includes(tab)&&draft.acceptedResults?.length))note(empty[tab]);
 if(tab==='overview'){
  if(!content.text)note('Your league page is ready before any teams register. Set the rules and calendar now; add teams later.');
  note(`First eligible matchnight: ${settings.startDate} · ${settings.time} (${settings.timeZone}) · every ${settings.repeatWeeks||1} week(s).`);
  const controls=card.querySelector('.workshop-settings');if(controls){controls.open=false;admin.append(controls);}
 }
 if(tab==='teams'){
  body.append(card.querySelector('.workshop-registration'));
  renderTeamManagement({host,admin,draft,onTeamEdit,onTeamRemove,onReport});
  renderRegistrationInvites({host:admin,draft,onSettings,onImport:onImportTeam,onReport});
 }
 if(tab==='matches'){
  renderSeasonCalendar({host:body,draft});
  if(!draft.scheduleGenerated)note('No fixtures yet. Add teams in Teams, close registration, then generate the schedule. The league page does not require fixtures to be published.');
  const windows=card.querySelector('.workshop-windows');if(windows)admin.append(windows);
  card.querySelectorAll(':scope > details:not(.workshop-settings)').forEach(night=>body.append(night));
  const calendar=card.querySelector('.workshop-settings');if(calendar)admin.append(calendar);
  if(draft.scheduleGenerated)note('Only explicitly accepted scheduled fixtures count in this local preview. EA candidates remain uncounted until reviewed. Exact positions missing from EA cannot qualify for TOTW automatically.');
 }
 if(tab==='finals')renderCupPlanner({host:body,draft,allDrafts,onSettings});
 if(tab==='videos'){
  body.replaceChildren();const directory=document.createElement('section');directory.innerHTML=`<p>Choose a team to find its streamers.</p><label>Team<select><option value="">All teams</option>${settings.teams.map(t=>`<option value="${escape(t.id)}">${escape(t.name)}</option>`).join('')}</select></label><div data-streamers></div>`;
  const render=()=>{const teamId=directory.querySelector('select').value,list=directory.querySelector('[data-streamers]');list.replaceChildren();for(const stream of content.streams||[]){const team=settings.teams.find(t=>t.id===stream.teamId);if(!team||teamId&&teamId!==team.id)continue;const card=document.createElement('article');card.className='rule-card';const title=document.createElement('h3'),name=document.createElement('p'),link=document.createElement('a');title.textContent=stream.name;name.textContent=team.name;link.href=stream.url;link.textContent='Open stream ↗';link.target='_blank';link.rel='noopener noreferrer';card.append(title,name,link);list.append(card);}if(!list.children.length){const p=document.createElement('p');p.textContent='No streamers added for this selection yet.';list.append(p);}};directory.querySelector('select').onchange=render;render();body.append(directory);
  if(content.videos?.length||content.links?.length)note('Previous video links are preserved in your draft backup. Add team-linked streamers using Manage stream links.');
 }
 if(tab==='standings'){
  note(`Regular-time win/loss: ${content.win??3}/${content.loss??0} points · Extra-time win/loss: ${content.extraTimeWin??2}/${content.extraTimeLoss??1} · No draws. Accepted local test fixtures only.`);
  const table=document.createElement('table');table.innerHTML=`<caption>Local preview standings · ${(draft.acceptedResults||[]).length} accepted fixtures</caption><thead><tr><th>Team</th><th>P</th><th>W</th><th>ET W</th><th>ET L</th><th>L</th><th>GF</th><th>GA</th><th>Pts</th></tr></thead><tbody>${leagueStandings(draft).map(t=>`<tr><td>${escape(t.name)}</td><td>${t.played}</td><td>${t.regularWins}</td><td>${t.extraWins}</td><td>${t.extraLosses}</td><td>${t.regularLosses}</td><td>${t.goalsFor}</td><td>${t.goalsAgainst}</td><td>${t.points}</td></tr>`).join('')}</tbody>`;body.append(table);
 }
 if(tab==='stats'){
  const rows=new Map();for(const p of acceptedAppearances(draft)){const key=JSON.stringify([p.teamId,p.playerId]);if(!rows.has(key))rows.set(key,{...p,apps:0,goals:0,assists:0,goalsKnown:true,assistsKnown:true,ratingSum:0,ratingCount:0});const r=rows.get(key);r.apps++;if(p.goals===null)r.goalsKnown=false;else r.goals+=p.goals;if(p.assists===null)r.assistsKnown=false;else r.assists+=p.assists;if(p.rating>0&&p.rating<=10&&!(p.rating===3&&(content.excludeDisconnectRatings??true))){r.ratingSum+=p.rating;r.ratingCount++;}}
  const table=document.createElement('table');table.innerHTML=`<caption>Accepted local fixture appearances only</caption><thead><tr><th>Player</th><th>Team</th><th>Apps</th><th>Goals</th><th>Assists</th><th>Rating</th></tr></thead><tbody>${[...rows.values()].map(p=>`<tr><td>${escape(p.name)}</td><td>${escape(p.teamName)}</td><td>${p.apps}</td><td>${p.goalsKnown?p.goals:'Unavailable'}</td><td>${p.assistsKnown?p.assists:'Unavailable'}</td><td>${p.ratingCount?(p.ratingSum/p.ratingCount).toFixed(2):'Unavailable'}</td></tr>`).join('')}</tbody>`;body.append(table);
 }
 renderSectionTools({host,admin,body,tab,settings,onSettings,onReport});
 if(tab==='rules')renderSectionTools({host,admin,body:admin,tab:'standings',settings,onSettings,onReport});
}
