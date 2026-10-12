import {escape as esc} from './team-hub-shell.js';
import {PHASES} from './team-tactics-model.js';
import {formationSlots} from './fc27-formations.js';
let enabled=true,leftId=null,rightId=null;

// View state only: both panels reference existing boards, never duplicated tactics.
export function comparisonPair(boards,activeId,left,right){
 const exists=id=>boards.some(b=>b.id===id);
 if(!exists(left))left=boards.find(b=>b.phase==='attack')?.id||activeId;
 if(!exists(right)||right===left)right=boards.find(b=>b.phase==='defence'&&b.id!==left)?.id||boards.find(b=>b.id!==left)?.id;
 if(activeId!==left&&activeId!==right)left=activeId;
 return {left,right};
}
function referencePitch(b,roster){
 const roles=formationSlots(b.formation);
 return `<div class="hub-pitch hub-reference-pitch" aria-label="${esc(b.name)} comparison pitch"><div class="pitch-lines"></div><i class="pitch-box top"></i><i class="pitch-box bottom"></i><i class="pitch-goal top"></i><i class="pitch-goal bottom"></i><svg class="hub-arrows" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="compare-tip" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#ffd76b"/></marker></defs>${b.arrows.map(a=>`<line x1="${a.from.x}" y1="${a.from.y}" x2="${a.to.x}" y2="${a.to.y}" stroke="#ffd76b" stroke-width=".5" stroke-dasharray="1 1" marker-end="url(#compare-tip)"/>`).join('')}</svg>${b.slots.map(s=>{const p=roster.find(p=>p.id===s.playerId),role=roles.find(r=>r.id===s.id).position;return `<span class="tactic-token ${p?'':'empty'}" style="left:${s.x}%;top:${s.y}%" title="${esc(s.instruction)}"><span class="token-shirt">${role}</span><span class="token-name">${esc(p?.name||'AI / unassigned')}</span></span>`;}).join('')}${b.opponents.map((p,i)=>`<span class="opponent" style="left:${p.x}%;top:${p.y}%">${i+1}</span>`).join('')}<span class="tactic-ball" style="left:${b.ball.x}%;top:${b.ball.y}%">●</span></div>`;
}
export function installBoardComparison(root,playbook,active,roster,switchBoard,render,editable){
 if(!active)return;
 const stage=root.querySelector('.hub-stage'),pitch=stage.querySelector('.hub-pitch');
 const controls=document.createElement('div');controls.className='hub-compare-controls';
 controls.innerHTML=`<button type="button" aria-pressed="${enabled}" data-compare-toggle>${enabled?'Side-by-side boards':'Single board'} ⇄</button><span class="hub-help">Compare attacking and defending shapes. Select either board to ${editable?'edit':'view'} it.</span>`;
 stage.prepend(controls);
 controls.querySelector('button').onclick=()=>{enabled=!enabled;render();};
 if(!enabled)return;
 ({left:leftId,right:rightId}=comparisonPair(playbook.boards,active.id,leftId,rightId));
 if(!rightId){controls.insertAdjacentHTML('beforeend','<p class="hub-help">Create another board to compare two shapes.</p>');return;}
 root.querySelector('.hub-shell').classList.add('hub-comparing');
 const grid=document.createElement('div');grid.className='hub-pitch-pair';pitch.before(grid);
 for(const [side,id] of [['left',leftId],['right',rightId]]){
  const b=playbook.boards.find(b=>b.id===id),current=id===active.id,panel=document.createElement('section');
  panel.className='hub-pitch-panel'+(current?' is-editing':'');
  panel.innerHTML=`<label>${side==='left'?'Left board':'Right board'}<select aria-label="${side==='left'?'Left':'Right'} comparison board">${playbook.boards.filter(b=>b.id!==(side==='left'?rightId:leftId)).map(b=>`<option value="${esc(b.id)}" ${b.id===id?'selected':''}>${esc(b.name)} · ${PHASES[b.phase]}</option>`).join('')}</select></label><div class="hub-panel-heading"><strong>${esc(b.formation)} · ${PHASES[b.phase]}</strong><button type="button" ${current?'disabled':''}>${current?(editable?'Editing this board':'Viewing this board'):(editable?'Edit this board':'View this board')}</button></div>`;
  panel.querySelector('select').onchange=e=>{if(side==='left')leftId=e.target.value;else rightId=e.target.value;if(current)switchBoard(e.target.value);else render();};
  panel.querySelector('button').onclick=()=>switchBoard(id);
  if(current)panel.append(pitch);else panel.insertAdjacentHTML('beforeend',referencePitch(b,roster));
  grid.append(panel);
 }
}
