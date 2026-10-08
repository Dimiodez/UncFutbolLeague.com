import {updatePageSettings,STAT_METRICS,TIEBREAKERS,FORMATIONS} from './league-page-model.js';
export const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const toggle=(name,label,hint,checked)=>`<label class="setting-toggle"><span><strong>${label}</strong><small>${hint}</small></span><input type="checkbox" name="${name}" ${checked?'checked':''}></label>`;
const number=(name,label,value,min=1,max=100)=>`<label>${label}<input type="number" name="${name}" min="${min}" max="${max}" value="${value}" required></label>`;
const select=(name,label,options,value)=>`<label>${label}<select name="${name}">${options.map(([key,title])=>`<option value="${escape(key)}" ${String(key)===String(value)?'selected':''}>${escape(title)}</option>`).join('')}</select></label>`;
const fieldset=(title,help,fields)=>`<fieldset class="editor-group"><legend>${title}</legend>${help?`<p>${help}</p>`:''}${fields}</fieldset>`;
const names={rules:'Rules & gameplay',videos:'Team stream links',players:'Roster & eligibility',finals:'Finals format',stats:'Statistics settings',standings:'Points & tiebreakers',awards:'Team of the Week settings'};

function openEditor(host,title,description){
 const dialog=document.createElement('dialog');dialog.className='league-editor-dialog';dialog.setAttribute('aria-labelledby','league-editor-title');
 dialog.innerHTML=`<form class="league-editor-form"><header><span class="section-kicker">League configuration · This device</span><h2 id="league-editor-title">${title}</h2><p>${description}</p></header><div data-editor-fields></div><p role="alert" data-editor-error></p><footer><button type="button" data-cancel>Cancel</button><button type="submit" class="button button-primary">Save changes</button></footer></form>`;
 host.append(dialog);const form=dialog.querySelector('form');let dirty=false;
 form.addEventListener('input',()=>{dirty=true;dialog.querySelector('[data-cancel]').textContent='Discard changes';});
 form.addEventListener('click',event=>{if(event.target.closest('[data-add-rule],[data-add-video],[data-remove],[data-move]')){dirty=true;dialog.querySelector('[data-cancel]').textContent='Discard changes';}});
 const close=()=>{dialog.close();dialog.remove();};
 dialog.querySelector('[data-cancel]').onclick=close;
 // Escape follows the explicit discard action, not browser-wide confirmation dialogs.
 dialog.addEventListener('cancel',event=>{if(dirty){event.preventDefault();dialog.querySelector('[data-cancel]').focus();dialog.querySelector('[data-editor-error]').textContent='You have unsaved changes. Save changes or choose Discard changes.';}});
 dialog.showModal();return {dialog,form,fields:dialog.querySelector('[data-editor-fields]'),error:dialog.querySelector('[data-editor-error]'),close};
}

export function renderSectionTools({host,admin,body,tab,settings,onSettings,onReport}){
 if(!names[tab]||tab==='awards')return;
 const content=settings.pageContent?.[tab]||{},summary=document.createElement('div');summary.className='league-config-summary';
 const badge=text=>`<span class="config-chip">${escape(text)}</span>`;
 if(tab==='rules'){
  summary.innerHTML=['ampsAllowed','boostsAllowed','anyAllowed'].map((key,index)=>badge(`${['Amps','Boosts','ANY'][index]}: ${content[key]===undefined?'not set':content[key]?'allowed':'not allowed'}`)).join('');
  for(const rule of content.items||[]){const card=document.createElement('article');card.className='rule-card';card.innerHTML=`<small>${escape(rule.category)}</small><h3>${escape(rule.title)}</h3><p class="league-page-text">${escape(rule.body)}</p>`;body.append(card);}
 }
 if(tab==='players')summary.innerHTML=badge(`Roster max: ${settings.maxTeamSize}`)+badge('One active team per league')+badge(`EA identity: ${content.requireEaIdentity===undefined?'not set':content.requireEaIdentity?'required':'optional'}`)+badge(`Roster changes: ${content.transferWindowOnly===undefined?'not set':content.transferWindowOnly?'transfer windows only':'no transfer-window restriction'}`);
 if(tab==='finals')summary.innerHTML=badge(`Format: ${{none:'No finals',knockout:'Knockout',topBottom:'Top / bottom brackets'}[content.format]||'not set'}`)+(content.format&&content.format!=='none'?badge(`${content.qualifiers} qualifying teams`)+badge(`${content.legs} leg(s)`)+badge(content.thirdPlace?'Third-place match':'No third-place match'):'');
 if(tab==='stats')summary.innerHTML=(content.metrics||[]).map(key=>badge(STAT_METRICS.find(([id])=>id===key)?.[1]||key)).join('')+badge(`Minimum appearances: ${content.minAppearances??'not set'}`)+badge(`3.0 ratings: ${content.excludeDisconnectRatings===undefined?'not set':content.excludeDisconnectRatings?'excluded from averages':'included'}`);
 if(tab==='standings')summary.innerHTML=badge(`Regular ${content.win??3}/${content.loss??0} · Extra time ${content.extraTimeWin??2}/${content.extraTimeLoss??1} · No draws`)+`<ol class="tiebreak-summary">${(content.tiebreakers||TIEBREAKERS.map(([key])=>key)).map(key=>`<li>${TIEBREAKERS.find(([id])=>id===key)[1]}</li>`).join('')}</ol>`;
 if(tab==='awards')summary.innerHTML=badge(`Formation: ${content.formation||'not set'}`)+badge(`Minimum appearances: ${content.minAppearances??'not set'}`)+badge(`Rank by: ${STAT_METRICS.find(([key])=>key===content.ranking)?.[1]||'not set'}`);
 body.prepend(summary);
 const toolbar=document.createElement('div');toolbar.className='section-action-bar';toolbar.innerHTML=`<div><h3>${names[tab]}</h3><p>${tab==='videos'?'Select a team, then add its streamers and channel links.':tab==='rules'?'Manage individual rules and gameplay policy.':'Save structured configuration. Applying it to shared rosters, results, brackets and awards is not connected yet.'}</p></div><button type="button">${tab==='videos'?'Manage stream links':'Edit settings'}</button>`;admin.append(toolbar);
 toolbar.querySelector('button').onclick=()=>{
  const editor=openEditor(host,names[tab],tab==='videos'?'Each streamer belongs to a registered team and has a channel link.':tab==='rules'?'Set the gameplay policy and add clear, categorized rules. These settings do not detect prohibited EA equipment.':'These settings are saved in this league draft. Shared enforcement and result processing are still to come.');
  const {form,fields,error}=editor;let getValues=()=>({});
  if(tab==='rules'){
   fields.innerHTML=fieldset('Gameplay policy','Unchecked means not allowed when this policy is saved.',toggle('ampsAllowed','Allow amps','Policy only — EA amp detection is not available here.',content.ampsAllowed)+toggle('boostsAllowed','Allow boosts','Saved league policy; not automatic equipment verification.',content.boostsAllowed)+toggle('anyAllowed','Allow ANY','Whether a human may control the ANY position.',content.anyAllowed))+fieldset('Rulebook','Add separate rules instead of one long text block.','<div data-rule-list></div><button type="button" data-add-rule>+ Add rule</button>');
   const list=fields.querySelector('[data-rule-list]');
   const addRule=(rule={category:'Gameplay',title:'',body:''})=>{const row=document.createElement('div');row.className='collection-edit-row';row.innerHTML=`${select('category','Category',['Gameplay','Conduct','Scheduling','Eligibility'].map(value=>[value,value]),rule.category)}<label>Rule title<input name="ruleTitle" maxlength="120" value="${escape(rule.title)}" required></label><label>Rule description<textarea name="ruleBody" rows="3" maxlength="3000" required>${escape(rule.body)}</textarea></label><button type="button" data-remove>Remove rule</button>`;row.querySelector('[data-remove]').onclick=()=>row.remove();list.append(row);};
   (content.items??(content.text?[{category:'Gameplay',title:'League rule',body:content.text}]:[])).forEach(addRule);fields.querySelector('[data-add-rule]').onclick=()=>addRule();
   getValues=()=>({text:'',ampsAllowed:form.elements.ampsAllowed.checked,boostsAllowed:form.elements.boostsAllowed.checked,anyAllowed:form.elements.anyAllowed.checked,items:[...list.children].map(row=>({category:row.querySelector('select').value,title:row.querySelector('input').value,body:row.querySelector('textarea').value}))});
  }
  if(tab==='videos'){
   fields.innerHTML='<div data-stream-list></div><button type="button" data-add-video>+ Add streamer</button><p>Links open the streamer’s channel. Live/offline detection is not connected.</p>';
   const list=fields.querySelector('[data-stream-list]');const addStream=(stream={teamId:'',name:'',url:''})=>{const row=document.createElement('div');row.className='collection-edit-row';row.innerHTML=select('streamTeam','Team',[['','Select a team'],...settings.teams.map(t=>[t.id,t.name])],stream.teamId)+`<label>Streamer name<input name="streamName" maxlength="120" value="${escape(stream.name)}" required></label><label>Stream link<input type="url" name="streamUrl" placeholder="https://twitch.tv/…" value="${escape(stream.url)}" maxlength="2000" required></label><button type="button" data-remove>Remove streamer</button>`;row.querySelector('select').required=true;row.querySelector('[data-remove]').onclick=()=>row.remove();list.append(row);};
   (content.streams||[]).forEach(addStream);fields.querySelector('[data-add-video]').onclick=()=>addStream();
   getValues=()=>({streams:[...list.children].map(row=>({teamId:row.querySelector('select').value,name:row.querySelector('[name="streamName"]').value,url:row.querySelector('[name="streamUrl"]').value})),videos:content.videos||(content.links||[]).map((url,index)=>({title:`Video ${index+1}`,url}))});
  }
  if(tab==='players'){
   fields.innerHTML=fieldset('Roster capacity','Includes starters and substitutes.',number('maxTeamSize','Maximum roster size',settings.maxTeamSize,settings.size,100))+fieldset('Eligibility','One active team per player per league is a fixed UFL requirement. A player may join a different team in another league.',toggle('requireEaIdentity','Require linked EA identity','Players need a linked EA identity before being eligible.',content.requireEaIdentity)+toggle('transferWindowOnly','Restrict changes to transfer windows','Uses the windows configured in Matches. Enforcement is pending.',content.transferWindowOnly));
   getValues=()=>({requireEaIdentity:form.elements.requireEaIdentity.checked,transferWindowOnly:form.elements.transferWindowOnly.checked});
  }
  if(tab==='finals'){
   fields.innerHTML=fieldset('Qualification & bracket','Configure the format now, even before teams register. This does not generate a bracket.',select('format','Finals format',[['none','No finals'],['knockout','Knockout bracket'],['topBottom','Separate top / bottom brackets']],content.format||'none')+`<div data-finals-options>${select('qualifiers','Qualifying teams',[2,4,8,16,32].map(count=>[count,`${count} teams`]),content.qualifiers||8)}${select('legs','Legs per tie',[[1,'Single match'],[2,'Two legs — aggregate']],content.legs||1)}${toggle('thirdPlace','Third-place match','Add a third-place fixture to the bracket.',content.thirdPlace)}</div>`);
   const sync=()=>{const disabled=form.elements.format.value==='none';fields.querySelector('[data-finals-options]').classList.toggle('settings-muted',disabled);fields.querySelectorAll('[data-finals-options] input,[data-finals-options] select').forEach(input=>input.disabled=disabled);};sync();form.elements.format.onchange=sync;
   getValues=()=>({format:form.elements.format.value,qualifiers:form.elements.qualifiers.value,legs:form.elements.legs.value,thirdPlace:form.elements.thirdPlace.checked});
  }
  if(tab==='stats'){
   fields.innerHTML=fieldset('Visible statistics','EA availability varies. A missing statistic must stay unavailable, not become a fabricated zero.',`<div class="metric-grid">${STAT_METRICS.map(([key,label])=>toggle(`metric-${key}`,label,'',(content.metrics||['goals','assists','rating']).includes(key))).join('')}</div>`)+fieldset('Leaderboard eligibility','Appearances, goals and assists remain counted when a 3.0 rating is excluded.',number('minAppearances','Minimum appearances',content.minAppearances??1)+toggle('excludeDisconnectRatings','Exclude 3.0 disconnect ratings','Exclude the rating only — preserve all other match statistics.',content.excludeDisconnectRatings??true));
   getValues=()=>({metrics:STAT_METRICS.filter(([key])=>form.elements[`metric-${key}`].checked).map(([key])=>key),minAppearances:form.elements.minAppearances.value,excludeDisconnectRatings:form.elements.excludeDisconnectRatings.checked});
  }
  if(tab==='standings'){
   fields.innerHTML=fieldset('Points per result','Only accepted local test fixtures count. No draws; confirm regular time or extra time.',`<div class="league-points">${number('win','Regular-time win',content.win??3,0,20)}${number('loss','Regular-time loss',content.loss??0,0,20)}${number('extraTimeWin','Extra-time win',content.extraTimeWin??2,0,20)}${number('extraTimeLoss','Extra-time loss',content.extraTimeLoss??1,0,20)}</div>`)+fieldset('Tiebreaker priority','Move a tiebreaker up or down. First in the list has highest priority.','<ol class="tiebreak-editor"></ol>');
   let order=[...(content.tiebreakers||TIEBREAKERS.map(([key])=>key))];const list=fields.querySelector('ol');
   const render=()=>{list.innerHTML=order.map((key,index)=>`<li><span>${index+1}. ${TIEBREAKERS.find(([id])=>id===key)[1]}</span><div><button type="button" data-move="${index}" data-direction="-1" aria-label="Move ${TIEBREAKERS.find(([id])=>id===key)[1]} up" ${index===0?'disabled':''}>↑</button><button type="button" data-move="${index}" data-direction="1" aria-label="Move ${TIEBREAKERS.find(([id])=>id===key)[1]} down" ${index===order.length-1?'disabled':''}>↓</button></div></li>`).join('');list.querySelectorAll('[data-move]').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.move),next=index+Number(button.dataset.direction);[order[index],order[next]]=[order[next],order[index]];render();});};render();
   getValues=()=>({win:form.elements.win.value,draw:0,loss:form.elements.loss.value,extraTimeWin:form.elements.extraTimeWin.value,extraTimeLoss:form.elements.extraTimeLoss.value,tiebreakers:order});
  }
  if(tab==='awards'){
   const count=Number(settings.size)-(settings.keepersEnabled?1:0),formations=FORMATIONS.filter(value=>value==='Custom'||value.split('-').reduce((sum,n)=>sum+Number(n),0)===count);
   if(content.formation&&!formations.includes(content.formation))formations.push(content.formation);
   fields.innerHTML=fieldset('Formation & selection',`${settings.size} per side; keepers ${settings.keepersEnabled?'enabled':'disabled'}. This saves selection settings, not an award lineup.`,select('formation','Award formation',formations.map(value=>[value,value]),content.formation||formations[0])+number('minAppearances','Minimum appearances',content.minAppearances??1)+select('ranking','Rank candidates by',STAT_METRICS.filter(([key])=>['rating','goals','assists','tackles'].includes(key)),content.ranking||'rating'));
   getValues=()=>({formation:form.elements.formation.value,minAppearances:form.elements.minAppearances.value,ranking:form.elements.ranking.value});
  }
  fields.querySelector('input,select,textarea,button')?.focus();
  form.onsubmit=event=>{event.preventDefault();try{let next=updatePageSettings(settings,tab,getValues());if(tab==='players')next={...next,maxTeamSize:Number(form.elements.maxTeamSize.value)};onSettings(next);onReport(`${names[tab]} saved on this device.`);}catch(issue){error.textContent=issue.message;}};
 };
}

export function renderTeamManagement({host,admin,draft,onTeamEdit,onTeamRemove,onReport}){
 const area=document.createElement('section');area.className='team-manager';area.innerHTML='<div class="section-action-bar"><div><h3>Manage registered teams</h3><p>Edit one team at a time. EA verification and manager accounts are not connected yet.</p></div></div><label>Find a team<input type="search" placeholder="Search team name" data-team-search></label><div class="team-manager-list"></div>';
 const list=area.querySelector('.team-manager-list');
 const render=()=>{const query=area.querySelector('input').value.toLowerCase(),teams=draft.settings.teams.filter(team=>team.name.toLowerCase().includes(query));list.innerHTML=teams.map(team=>`<article><div><strong>${escape(team.name)}</strong><small>${team.eaClubId?`EA club ${escape(team.eaClubId)} · unverified`:'EA club not linked'}</small></div><button type="button" data-manage="${escape(team.id)}">Edit team</button></article>`).join('')||'<p>No matching teams. Register teams using the form above.</p>';
  list.querySelectorAll('[data-manage]').forEach(button=>button.onclick=()=>{
   const team=draft.settings.teams.find(team=>team.id===button.dataset.manage),editor=openEditor(host,`Manage ${escape(team.name)}`,'Changing the draft does not change the EA club itself.');
   editor.fields.innerHTML=fieldset('Team details',draft.scheduleGenerated?'Reopen registration before editing/removing teams. Existing fixtures must be regenerated.':'EA IDs must be numeric and unique within this league.',`<label>Team name<input name="name" maxlength="80" value="${escape(team.name)}" required></label><label>EA club ID<input name="eaClubId" inputmode="numeric" pattern="[0-9]{1,20}" value="${escape(team.eaClubId||'')}" placeholder="Optional until linked"></label>`)+`<fieldset class="editor-group danger-zone"><legend>Remove from this draft league</legend><p>This removes the team entry from this league only. No live data or EA club is deleted.</p><button type="button" data-remove-team ${draft.scheduleGenerated?'disabled':''}>Remove team…</button><div data-remove-confirm hidden><p>Remove <strong>${escape(team.name)}</strong>? Export a draft backup first if you need to recover this entry.</p><button type="button" data-confirm-remove>Yes, remove ${escape(team.name)}</button><button type="button" data-keep-team>Keep team</button></div></fieldset>`;
   if(draft.scheduleGenerated){editor.form.querySelector('button[type="submit"]').disabled=true;editor.fields.querySelectorAll('input').forEach(input=>input.disabled=true);}
   editor.fields.querySelector('[data-remove-team]').onclick=()=>editor.fields.querySelector('[data-remove-confirm]').hidden=false;
   editor.fields.querySelector('[data-keep-team]').onclick=()=>editor.fields.querySelector('[data-remove-confirm]').hidden=true;
   editor.fields.querySelector('[data-confirm-remove]').onclick=()=>{try{onTeamRemove(team.id);}catch(error){editor.error.textContent=error.message;}};
   editor.fields.querySelector('input')?.focus();
   editor.form.onsubmit=event=>{event.preventDefault();try{onTeamEdit(team.id,Object.fromEntries(new FormData(editor.form)));}catch(error){editor.error.textContent=error.message;}};
  });
 };render();area.querySelector('input').oninput=render;admin.append(area);
}
