// Presentation and interaction helpers only; private access and saves stay unchanged.
let squadSearch='',squadFilter='all',detailsOpen=false,actionsOpen=false,notesOpen=false,sidebarView='squad';
export function squadMatches(name,assigned,search,filter){
 return name.toLowerCase().includes(search.trim().toLowerCase())&&(filter==='all'||(filter==='assigned'?assigned:!assigned));
}
function disclosure(summary,className,open,change){
 const el=document.createElement('details');el.className=className;el.open=open;
 const title=document.createElement('summary');title.textContent=summary;el.append(title);el.ontoggle=()=>change(el.open);return el;
}
export function installTeamHubUX(root,{board,roster,selectedSlot,selectedPlayer,editable,busy,clearPosition,cancelSelection}){
 const shell=root.querySelector('.hub-shell');if(!shell)return;
 shell.classList.add('hub-refined');
 const reload=root.querySelector('[data-reload]');if(reload){reload.textContent='Reload';reload.title='Reload saved game plans and the latest registered squad';}
 root.querySelectorAll('.hub-actions button').forEach(el=>{if(el.title==='Reload current roster and saved tactics, including players registered later')el.hidden=true;});
 const add=root.querySelector('[data-new]');if(add)add.textContent='+ New game plan';
 const stage=root.querySelector('.hub-stage'),sidebar=root.querySelector('.hub-squad-sidebar');
 if(!stage||!sidebar)return;
 const controls=stage.querySelector('.hub-board-controls'),name=controls?.querySelector('.hub-name');
 if(name){const details=disclosure('Board details','hub-details',detailsOpen,v=>detailsOpen=v);details.append(name);controls.after(details);}
 const help=stage.querySelector('[data-help]');if(help){help.classList.add('hub-context-help');help.hidden=stage.querySelector('[data-tool="move"]')?.getAttribute('aria-pressed')==='true';}
 const oldHint=stage.querySelector('.hub-compare-controls .hub-help');if(oldHint)oldHint.hidden=true;
 const heading=document.createElement('div');heading.className='hub-stage-heading';
 const title=document.createElement('h3');title.textContent=board?.name||'Team playbook';heading.append(title);
 const badge=document.createElement('span');badge.className='hub-editor-badge';badge.textContent=editable?'Editing this game plan':'View only';heading.append(badge);stage.prepend(heading);
 const toolLabels={move:'Arrange players',arrow:'Draw a run',opponent:'Opponents',ball:'Move ball'};
 stage.querySelectorAll('[data-tool]').forEach(el=>{el.textContent=toolLabels[el.dataset.tool];el.title=el.textContent;});
 const bottomActions=stage.querySelector('[data-reset-shape]')?.parentElement;
 if(bottomActions){const menu=disclosure('More board actions','hub-more-actions',actionsOpen,v=>actionsOpen=v);menu.append(bottomActions);stage.querySelector('.hub-toolbar')?.after(menu);}
 const notes=root.querySelector('[data-notes]')?.closest('label');
 if(notes){const panel=disclosure('Team coaching notes','hub-team-notes',notesOpen,v=>notesOpen=v);panel.append(notes);stage.append(panel);}
 const position=root.querySelector('.hub-inspector>section');let positionCard;
 if(position&&selectedSlot){
  positionCard=document.createElement('section');positionCard.className='hub-position-card';
  const slot=board?.slots.find(s=>s.id===selectedSlot),player=roster.find(p=>p.id===slot?.playerId);
  const h=document.createElement('h3');h.textContent=selectedSlot+' · '+(player?.name||'Unassigned');positionCard.append(h);
  position.querySelectorAll('label').forEach(label=>positionCard.append(label));
  if(editable&&slot?.playerId){const clear=document.createElement('button');clear.type='button';clear.textContent='Remove from this position';clear.onclick=clearPosition;positionCard.append(clear);}
  sidebar.prepend(positionCard);
 }
 const inspector=root.querySelector('.hub-inspector');if(inspector)inspector.hidden=true;
 const squad=sidebar.querySelector('.hub-roster'),players=[...squad.querySelectorAll('[data-player]')];
 const squadSection=squad.closest('section'),tabs=document.createElement('div');tabs.className='hub-sidebar-tabs';tabs.setAttribute('aria-label','Squad and position controls');
 const squadTab=document.createElement('button');squadTab.textContent='Squad';squadTab.type='button';
 const positionTab=document.createElement('button');positionTab.textContent=selectedSlot?'Position · '+selectedSlot:'Position details';positionTab.type='button';positionTab.disabled=!selectedSlot;
 positionTab.title=selectedSlot?'Assignments and instructions for '+selectedSlot:'Select a position on the pitch first';
 const showPanel=()=>{if(!selectedSlot)sidebarView='squad';squadSection.hidden=sidebarView!=='squad';if(positionCard)positionCard.hidden=sidebarView!=='position';squadTab.setAttribute('aria-pressed',String(sidebarView==='squad'));positionTab.setAttribute('aria-pressed',String(sidebarView==='position'));};
 squadTab.onclick=()=>{sidebarView='squad';showPanel();};positionTab.onclick=()=>{sidebarView='position';showPanel();};tabs.append(squadTab,positionTab);sidebar.prepend(tabs);showPanel();
 const squadControls=document.createElement('div');squadControls.className='hub-squad-controls';
 const search=document.createElement('input');search.type='search';search.placeholder='Find a player…';search.setAttribute('aria-label','Find a registered player');search.value=squadSearch;
 const filter=document.createElement('select');filter.setAttribute('aria-label','Filter registered squad');
 for(const [value,label] of [['all','All players'],['available','Not placed on this board'],['assigned','Placed on this board']]){const o=document.createElement('option');o.value=value;o.textContent=label;filter.append(o);}filter.value=squadFilter;
 const count=document.createElement('p');count.className='hub-squad-count';count.setAttribute('aria-live','polite');
 squadControls.append(search,filter,count);squad.before(squadControls);
 const apply=()=>{let visible=0;for(const button of players){const p=roster.find(p=>p.id===button.dataset.player),assigned=!!board?.slots.some(s=>s.playerId===p?.id),show=squadMatches(p?.name||'',assigned,search.value,filter.value);button.hidden=!show;if(show)visible++;button.classList.toggle('is-assigned',assigned);}
  count.textContent=visible+' of '+players.length+' players';squadSearch=search.value;squadFilter=filter.value;};
 search.oninput=apply;filter.onchange=apply;apply();
 const instruction=document.createElement('div');instruction.className='hub-placement-hint';instruction.setAttribute('role','status');
 const selected=roster.find(p=>p.id===selectedPlayer);
 instruction.textContent=!editable?'Select a position to read its instructions.':selected?'Selected: '+selected.name+' — choose a position on the active pitch.':'Drag a player onto either pitch, or select a player and then a position.';
 if(selectedPlayer){const clear=document.createElement('button');clear.type='button';clear.textContent='Cancel selection';clear.onclick=cancelSelection;instruction.append(clear);}
 sidebar.querySelector('.hub-roster')?.after(instruction);
 sidebar.querySelectorAll('.hub-help').forEach(el=>el.hidden=true);
 root.querySelectorAll('.tactic-token.empty .token-name').forEach(el=>{el.textContent='Unassigned';el.title='AI / unassigned position';});
 root.querySelectorAll('[data-board]').forEach(el=>{const small=el.querySelector('small');if(small)el.title=small.textContent;});
 const save=root.querySelector('[data-save]');if(save&&!save.textContent.includes('demo'))save.textContent='Save playbook';
 if(busy){const state=root.querySelector('[data-save-state]');if(state)state.textContent='Saving…';if(save)save.textContent='Saving…';}
 if(!board)heading.hidden=true;
}
