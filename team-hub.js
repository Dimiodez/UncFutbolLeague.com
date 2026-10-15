import {installWorkshopBrand,escape as esc} from './team-hub-shell.js?v=20261013-recovery2';
import {FC27_FORMATIONS,formationSlots} from './fc27-formations.js?v=20261013-recovery2';
import {PHASES,newTactic,assignPlayer,changeFormation} from './team-tactics-model.js?v=20261013-recovery2';
import {installBoardComparison} from './team-hub-comparison.js?v=20261013-recovery2';
import {installTeamHubUX} from './team-hub-ux.js?v=20261013-recovery2';
installWorkshopBrand();
// Styles are loaded by the HTML shell, even if a module cannot start.
const root=document.querySelector('#team-hub-root'),message=document.querySelector('#hub-message');
let context,playbook,revision=0,activeId,selectedSlot=null,selectedPlayer=null,phaseFilter='all',tool='move',arrowStart=null,dirty=false,busy=false,undo=[];
// Live hubs never enable the workshop's public demo or local-save path.
const board=()=>playbook?.boards.find(b=>b.id===activeId);
const person=id=>context.roster.find(p=>p.id===id);
const canEdit=()=>!!context?.team.canEdit;
async function api(query='',body){const r=await fetch('/api/team-hub'+query,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok){const e=Error(d.error||'Unable to open team hub.');e.status=r.status;throw e;}return d;}
function savedState(){const el=root.querySelector('[data-save-state]');if(el){el.textContent=dirty?'Unsaved changes':'Saved online';el.classList.toggle('hub-unsaved',dirty);}const save=root.querySelector('[data-save]');if(save)save.disabled=busy||!dirty||!canEdit();}
function changed(){dirty=true;savedState();}
function edit(fn){if(!canEdit()||busy)return;undo.push(JSON.stringify(playbook));if(undo.length>40)undo.shift();fn();changed();render();}
function switchBoard(id){activeId=id;selectedSlot=null;selectedPlayer=null;arrowStart=null;render();}
function point(event){const r=root.querySelector('.hub-pitch:not(.hub-reference-pitch)').getBoundingClientRect();return {x:Math.max(3,Math.min(97,(event.clientX-r.left)/r.width*100)),y:Math.max(3,Math.min(97,(event.clientY-r.top)/r.height*100))};}
function newBoard(){if(playbook.boards.length>=30){message.textContent='Your playbook can hold up to 30 boards.';return;}edit(()=>{const b=newTactic(`Game plan ${playbook.boards.length+1}`,phaseFilter==='all'?'attack':phaseFilter);playbook.boards.push(b);activeId=b.id;selectedSlot=null;});}
async function load(){
 if(dirty&&!confirm('Reloading replaces your unsaved edits with the saved playbook. Continue?'))return;
 try{const teamId=new URLSearchParams(location.search).get('team');
  if(!teamId){const data=await api();root.innerHTML=`<section class="rule-card"><span class="hub-kicker">Your private dressing rooms</span><h2>Choose your team</h2>${data.teams.map(t=>`<p><a class="hub-link" href="/team-hub?team=${encodeURIComponent(t.id)}">${esc(t.name)} · ${t.canEdit?'Manager suite':'Team playbook'}${t.sandbox?' · Roma test workspace':''}</a></p>`).join('')||'<p>Your approved teams will appear here once you are registered as a manager or player.</p>'}</section>`;return;}
  context=await api('?team='+encodeURIComponent(teamId));playbook=context.playbook;revision=context.revision;dirty=false;undo=[];selectedSlot=null;selectedPlayer=null;
  if(!playbook.boards.length&&canEdit()){playbook.boards=[newTactic('Build from the back','attack','4-3-3'),newTactic('Compact defensive shape','defence','4-4-2')];dirty=true;}
  activeId=playbook.boards[0]?.id;document.title=`${context.team.name} · Private team hub`;render();message.textContent='';
 }catch(e){message.textContent=e.message;root.innerHTML=e.status===401?`<section class="rule-card"><h2>Your team’s private dressing room</h2><p>Sign in with Discord and we’ll bring you straight back to this team hub. A team manager assignment or a verified roster link is required.</p><a class="hub-link" href="/account?returnTo=${encodeURIComponent(location.pathname+location.search)}">Sign in with Discord</a><p>Not linked to your team yet? <a href="/contact">Ask league staff to check your team access</a>.</p></section>`:'<section class="rule-card"><h2>Team hub unavailable</h2><p>This area is private to authorized team members.</p><a href="/team-hub">Back to my teams</a></section>';root.querySelector('[data-refresh]')?.addEventListener('click',load);}
}
function render(){
 const b=board(),team=context.team,editable=canEdit(),slot=b?.slots.find(s=>s.id===selectedSlot),slots=b?formationSlots(b.formation):[];
 root.innerHTML=`<section class="hub-hero"><img src="${esc(team.logo)}" alt="${esc(team.name)} crest"><div><span class="hub-kicker">Team hub suite${team.sandbox?' · Workshop test':''}</span><h2>${esc(team.name)}</h2><div class="hub-meta"><span>${esc(team.league)}</span><span class="hub-private">Private · ${editable?'Manager access':'Team member access'}</span><a href="${esc(team.publicUrl)}">Public team page ↗</a></div></div></section><section class="hub-shell"><div class="hub-topbar"><div><h2>Tactics & coaching</h2><span class="hub-save" data-save-state></span></div><div class="hub-actions"><button data-reload>Reload saved</button>${editable?'<button data-new>+ New board</button><button data-save class="hub-primary">Save team playbook</button>':''}</div></div><div class="hub-columns"><aside class="hub-library"><span class="hub-kicker">The playbook</span><h3>Tactical boards</h3><label>Situation<select data-filter><option value="all">All situations</option>${Object.entries(PHASES).map(([id,label])=>`<option value="${id}" ${phaseFilter===id?'selected':''}>${label}</option>`).join('')}</select></label><div class="hub-board-list">${playbook.boards.filter(b=>phaseFilter==='all'||b.phase===phaseFilter).map(b=>`<button data-board="${esc(b.id)}" aria-current="${b.id===activeId}"><strong>${esc(b.name)}</strong><small>${PHASES[b.phase]} · ${esc(b.formation)}</small></button>`).join('')||'<p class="hub-help">No boards in this situation yet.</p>'}</div><p class="hub-help">${editable?'Build your attacking and defensive shapes. Save separate boards for pressing, transitions, corners or specific opponents.':'Your managers’ saved game plans. Select a player position to read their instructions.'}</p><p class="hub-help">${esc(context.rosterSource)}</p>${team.sandbox?'<p class="hub-help">Roma test playbook only. Changes here stay in the workshop.</p>':''}</aside><section class="hub-stage">${b?`<div class="hub-board-controls"><label class="hub-name">Board name<input data-name maxlength="80" value="${esc(b.name)}" ${editable?'':'disabled'}></label><label>Phase<select data-phase ${editable?'':'disabled'}>${Object.entries(PHASES).map(([id,label])=>`<option value="${id}" ${b.phase===id?'selected':''}>${label}</option>`).join('')}</select></label><label>Formation<select data-formation ${editable?'':'disabled'}>${Object.keys(FC27_FORMATIONS).map(f=>`<option ${b.formation===f?'selected':''}>${esc(f)}</option>`).join('')}</select></label></div>${editable?`<div class="hub-toolbar" aria-label="Tactical board tools"><button data-tool="move" aria-pressed="${tool==='move'}">Move / select</button><button data-tool="arrow" aria-pressed="${tool==='arrow'}">Draw runs</button><button data-tool="opponent" aria-pressed="${tool==='opponent'}">Add opponent</button><button data-tool="ball" aria-pressed="${tool==='ball'}">Place ball</button><button data-undo ${undo.length?'':'disabled'}>Undo</button></div>`:''}<p class="hub-direction">ATTACK ↑</p><div class="hub-pitch" aria-label="${esc(b.name)} tactical pitch"><div class="pitch-lines"></div><i class="pitch-box top"></i><i class="pitch-box bottom"></i><i class="pitch-goal top"></i><i class="pitch-goal bottom"></i><svg class="hub-arrows" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="run-tip" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#ffd76b"/></marker></defs>${b.arrows.map(a=>`<line x1="${a.from.x}" y1="${a.from.y}" x2="${a.to.x}" y2="${a.to.y}" stroke="#ffd76b" stroke-width=".5" stroke-dasharray="1 1" marker-end="url(#run-tip)"/>`).join('')}${arrowStart?`<circle cx="${arrowStart.x}" cy="${arrowStart.y}" r="1" fill="#ffd76b"/>`:''}</svg>${b.slots.map(s=>{const p=person(s.playerId),pos=slots.find(x=>x.id===s.id).position;return `<button class="tactic-token ${p?'':'empty'} ${selectedSlot===s.id?'selected':''}" data-slot="${s.id}" style="left:${s.x}%;top:${s.y}%" aria-label="${s.id}: ${esc(p?.name||'AI / unassigned')}"><span class="token-shirt">${pos}</span><span class="token-name">${esc(p?.name||(s.playerId?'Former roster player':'AI / unassigned'))}</span></button>`;}).join('')}${b.opponents.map((p,i)=>`<button class="opponent" data-opponent="${i}" aria-label="Opponent ${i+1}. Double-click to remove." style="left:${p.x}%;top:${p.y}%">${i+1}</button>`).join('')}<button class="tactic-ball" data-ball aria-label="Ball" style="left:${b.ball.x}%;top:${b.ball.y}%">●</button></div><div class="hub-stats"><span>${b.slots.filter(s=>s.playerId).length} players assigned</span><span>${b.arrows.length} runs</span><span>${b.opponents.length} opponents</span></div><p class="hub-help" data-help>${tool==='arrow'?'Click the start and end of a run on the pitch.':tool==='opponent'?'Click the pitch to add an opponent. Drag to reposition; double-click to remove.':tool==='ball'?'Click the pitch to move the ball.':editable?'Drag roster players onto positions. Drag position markers to adjust the shape, or select a position and click the pitch to move it. On mobile, select a roster player then a position.':'Select a position to view the manager’s instructions.'}</p>${editable?'<div class="hub-toolbar"><button data-reset-shape>Reset shape</button><button data-clear-arrows>Clear runs</button><button data-clear-opponents>Clear opponents</button><button data-duplicate>Duplicate board</button><button class="hub-danger" data-delete>Delete board</button></div>':''}`:'<div class="hub-empty"><h3>Your game plans live here.</h3><p>Create a tactical board to get started.</p></div>'}</section><aside class="hub-inspector"><section><span class="hub-kicker">Coach’s instructions</span><h3>${slot?esc(slot.id):'Game plan'}</h3>${b?`${slot?`<label>Player<select data-assignment ${editable?'':'disabled'}><option value="">AI / unassigned</option>${context.roster.map(p=>`<option value="${esc(p.id)}" ${p.id===slot.playerId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label>Position instructions<textarea data-instruction maxlength="500" ${editable?'':'disabled'} placeholder="Hold width, cover the overlap, press on the trigger…">${esc(slot.instruction)}</textarea></label>`:'<p class="hub-help">Select a position on the pitch for individual instructions.</p>'}<label>Team instructions<textarea data-notes maxlength="5000" ${editable?'':'disabled'} placeholder="Describe the pressing triggers, passing routes and responsibilities for this situation…">${esc(b.notes)}</textarea></label>`:''}</section><section><h3 class="hub-roster-title">Registered squad <small>(${context.roster.length})</small></h3><div class="hub-roster">${context.roster.map(p=>`<button data-player="${esc(p.id)}" draggable="${editable}" aria-pressed="${selectedPlayer===p.id}" ${editable?'':'disabled'}><span>${esc(p.name)}</span><small>${b?.slots.find(s=>s.playerId===p.id)?.id||'Bench'}</small></button>`).join('')||'<p class="hub-help">Approved team players will appear here as they register.</p>'}</div><p class="hub-help">Players may appear once on each board. Empty positions represent AI or an unassigned role.</p></section></aside></div></section>`;
 if(team.isOwner&&!editable)root.querySelector('.hub-private').textContent='Private · Owner inspection (read-only)';
 if(!b&&!editable)root.querySelector('.hub-empty p').textContent='Your managers have not saved a game plan yet.';
 const refresh=document.createElement('button');refresh.textContent='Refresh registered squad';refresh.title='Reload current roster and saved tactics, including players registered later';refresh.onclick=load;root.querySelector('.hub-topbar .hub-actions').append(refresh);
 installBoardComparison(root,playbook,b,context.roster,switchBoard,render,editable);
 // Move the existing squad nodes, retaining one roster and its normal bindings.
 const inspector=root.querySelector('.hub-inspector'),squad=inspector?.children[1];
 if(squad){const sidebar=document.createElement('aside');sidebar.className='hub-squad-sidebar';sidebar.setAttribute('aria-label','Registered squad player selector');sidebar.append(squad);root.querySelector('.hub-columns').append(sidebar);}
 savedState();bind();
 installTeamHubUX(root,{board:b,roster:context.roster,selectedSlot,selectedPlayer,editable,busy,clearPosition:()=>edit(()=>assignPlayer(board(),selectedSlot,null)),cancelSelection:()=>{selectedPlayer=null;selectedSlot=null;render();}});
}
function bind(){
 const on=(selector,event,fn)=>root.querySelectorAll(selector).forEach(el=>el.addEventListener(event,fn));
 on('[data-reload]','click',load);on('[data-new]','click',newBoard);on('[data-board]','click',e=>switchBoard(e.currentTarget.dataset.board));
 on('[data-filter]','change',e=>{phaseFilter=e.target.value;render();});
 on('[data-save]','click',async()=>{if(busy||!dirty)return;busy=true;render();try{const r=await api('',{teamId:context.team.id,accountId:context.accountId,revision,playbook});revision=r.revision;message.textContent='Saved online · your team playbook is available across devices.';dirty=false;}catch(e){message.textContent=e.message;}finally{busy=false;render();}});
 on('[data-name]','input',e=>{board().name=e.target.value;changed();});on('[data-name]','change',render);
 on('[data-phase]','change',e=>edit(()=>{board().phase=e.target.value;}));
 on('[data-formation]','change',e=>edit(()=>{changeFormation(board(),e.target.value);selectedSlot=null;}));
 on('[data-notes]','input',e=>{board().notes=e.target.value;changed();});
 on('[data-instruction]','input',e=>{board().slots.find(s=>s.id===selectedSlot).instruction=e.target.value;changed();});
 on('[data-assignment]','change',e=>edit(()=>assignPlayer(board(),selectedSlot,e.target.value||null)));
 on('[data-player]','click',e=>{selectedPlayer=e.currentTarget.dataset.player;if(selectedSlot)edit(()=>{assignPlayer(board(),selectedSlot,selectedPlayer);selectedPlayer=null;});else render();});
 on('[data-player]','dragstart',e=>{if(canEdit())e.dataTransfer.setData('text/ufl-player',e.currentTarget.dataset.player);});
 // Pointer-driven squad dragging works with mouse, touch and a sticky sidebar.
 on('[data-player]','pointerdown',e=>{
  if(!canEdit()||busy||e.button!==0)return;
  e.preventDefault();const el=e.currentTarget,id=el.dataset.player,start={x:e.clientX,y:e.clientY};let ghost,moved=false;
  el.setPointerCapture(e.pointerId);
  const move=ev=>{if(!moved&&Math.hypot(ev.clientX-start.x,ev.clientY-start.y)<6)return;moved=true;
   if(!ghost){ghost=document.createElement('div');ghost.className='hub-player-drag-preview';ghost.textContent=person(id)?.name||'Player';document.body.append(ghost);document.body.classList.add('hub-dragging');}
   ghost.style.left=(ev.clientX+12)+'px';ghost.style.top=(ev.clientY+12)+'px';
  };
  const cleanup=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',cancel);ghost?.remove();document.body.classList.remove('hub-dragging');};
  const end=ev=>{const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-slot],[data-comparison-slot]');cleanup();
   if(moved){ev.preventDefault();if(target){const targetBoard=target.dataset.comparisonBoard||activeId,targetSlot=target.dataset.comparisonSlot||target.dataset.slot;edit(()=>{activeId=targetBoard;selectedSlot=targetSlot;selectedPlayer=null;assignPlayer(board(),targetSlot,id);});}}
  };
  const cancel=()=>cleanup();el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',cancel);
 });
 on('[data-slot]','dragover',e=>{if(canEdit())e.preventDefault();});
 on('[data-slot]','drop',e=>{e.preventDefault();const id=e.dataTransfer.getData('text/ufl-player');if(context.roster.some(p=>p.id===id))edit(()=>{selectedSlot=e.currentTarget.dataset.slot;assignPlayer(board(),selectedSlot,id);selectedPlayer=null;});});
 on('[data-tool]','click',e=>{tool=e.currentTarget.dataset.tool;arrowStart=null;selectedSlot=null;selectedPlayer=null;render();});
 on('[data-undo]','click',()=>{if(undo.length){playbook=JSON.parse(undo.pop());if(!board())activeId=playbook.boards[0]?.id;selectedSlot=null;changed();render();}});
 on('[data-reset-shape]','click',()=>edit(()=>{for(const s of formationSlots(board().formation)){const current=board().slots.find(p=>p.id===s.id);current.x=s.x;current.y=s.y;}}));
 on('[data-clear-arrows]','click',()=>edit(()=>{board().arrows=[];arrowStart=null;}));on('[data-clear-opponents]','click',()=>edit(()=>{board().opponents=[];}));
 on('[data-duplicate]','click',()=>{if(playbook.boards.length>=30)return;edit(()=>{const b=structuredClone(board());b.id=crypto.randomUUID();b.name=(b.name+' copy').slice(0,80);playbook.boards.push(b);activeId=b.id;});});
 on('[data-delete]','click',()=>{if(confirm('Delete this tactical board? Save the playbook to keep the deletion.'))edit(()=>{playbook.boards=playbook.boards.filter(b=>b.id!==activeId);activeId=playbook.boards[0]?.id;selectedSlot=null;});});
 on('[data-opponent]','dblclick',e=>edit(()=>{board().opponents.splice(Number(e.currentTarget.dataset.opponent),1);}));
 const pitch=root.querySelector('.hub-pitch:not(.hub-reference-pitch)');if(!pitch)return;
 pitch.addEventListener('click',e=>{
  if(busy)return;const token=e.target.closest('[data-slot]');
  if(tool==='move'&&token){selectedSlot=token.dataset.slot;if(selectedPlayer&&canEdit())edit(()=>{assignPlayer(board(),selectedSlot,selectedPlayer);selectedPlayer=null;});else render();return;}
  if(!canEdit())return;const p=point(e);
  if(tool==='arrow'){if(!arrowStart){arrowStart=p;render();}else if(board().arrows.length<30)edit(()=>{board().arrows.push({from:arrowStart,to:p});arrowStart=null;});}
  else if(tool==='opponent'){if(board().opponents.length<11)edit(()=>board().opponents.push(p));}
  else if(tool==='ball')edit(()=>{board().ball=p;});
  else if(selectedSlot&&!e.target.closest('button'))edit(()=>Object.assign(board().slots.find(s=>s.id===selectedSlot),p));
 });
 // Pointer capture supports both mouse and touch positioning without native drag assumptions.
 on('[data-slot],[data-opponent],[data-ball]','pointerdown',e=>{
  if(!canEdit()||busy||tool!=='move'||e.button!==0)return;
  const el=e.currentTarget,start={x:e.clientX,y:e.clientY},target=el.dataset.slot?board().slots.find(s=>s.id===el.dataset.slot):el.hasAttribute('data-ball')?board().ball:board().opponents[Number(el.dataset.opponent)];
  let moved=false,pos;el.setPointerCapture(e.pointerId);
  const move=ev=>{if(Math.hypot(ev.clientX-start.x,ev.clientY-start.y)>5){moved=true;pos=point(ev);el.style.left=pos.x+'%';el.style.top=pos.y+'%';}};
  const end=ev=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',cancel);if(moved){ev.preventDefault();el.addEventListener('click',event=>event.stopPropagation(),{once:true});edit(()=>Object.assign(target,pos));}};
  const cancel=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',cancel);render();};
  el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',cancel);
 });
 // Disable editing controls during the request so successful saves cannot hide newer changes.
 if(busy)root.querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=true);
}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
load();
