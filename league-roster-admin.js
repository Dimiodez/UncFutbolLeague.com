// Website roster management is separate from OAuth accounts and official VA results.
const leagueManagedRosterState={players:null,signature:'',loadedAt:0,promise:null};
async function refreshLeagueRosters(force=false){
 if(!force&&Date.now()-leagueManagedRosterState.loadedAt<15000)return false;
 if(leagueManagedRosterState.promise)return leagueManagedRosterState.promise;
 leagueManagedRosterState.promise=(async()=>{
  const response=await fetch('/api/league-rosters',{cache:'no-store'});if(!response.ok)throw new Error('Roster unavailable.');
  const data=await response.json(),signature=JSON.stringify(data.players),changed=signature!==leagueManagedRosterState.signature;
  leagueManagedRosterState.players=data.players;leagueManagedRosterState.signature=signature;leagueManagedRosterState.loadedAt=Date.now();return changed;
 })();
 try{return await leagueManagedRosterState.promise;}finally{leagueManagedRosterState.promise=null;}
}
async function hydrateLeagueRosters(){
 if(!/^\/(?:players|clubs|teams|league)(?:\/|$)/.test(location.pathname)&&location.pathname!=='/')return;
 const params=new URLSearchParams(location.search),nav=document.querySelector('.league-club-filters');
 if(leagueManagedRosterState.players&&params.get('season')!=='1')document.querySelectorAll('.league-explorer .sync-note').forEach(note=>{if(/collaborator|Provisional Season 2 rosters/.test(note.textContent))note.textContent='Staff-managed Season 2 player rosters · official VA registration and EA linking remain separate.';});
 if(nav&&params.get('season')!=='1'&&!nav.querySelector('[data-free-agents]')){const division=params.get('division')==='10v10'?'10v10':'6v6';nav.insertAdjacentHTML('beforeend',`<a data-free-agents class="${params.get('club')==='free-agent'?'active':''}" href="/players?season=2&division=${division}&club=free-agent" data-link>Free agents</a>`);}
 try{if(await refreshLeagueRosters())render();}catch{/* Existing public snapshot remains available. */}
}
async function hydrateAdminPlayers(root){
 if(!root)return;
 root.innerHTML=`<h2>Players & team assignments</h2><p>Add players using their Discord username. This creates a league record, not a login or verified Discord account. Players can belong to one team in each division. Release them to Free agent to keep them in the player pool.</p><form data-add-player class="photo-upload-form"><label>Discord username<input name="discordName" maxlength="80" placeholder="e.g. DimiOdez" required></label><button class="button button-primary">Add player</button></form><p data-roster-message role="status" aria-live="polite"></p><div class="roster-filters"><label>Find a player<input type="search" data-roster-search placeholder="Discord name"></label><label>Division<select data-roster-division><option value="6v6">Season 2 · 6v6</option><option value="10v10">Season 2 · 10v10</option></select></label><label>Team / status<select data-roster-team-filter></select></label></div><p data-roster-count></p><div data-roster-list></div>`;
 let data,busy=false;
 const message=root.querySelector('[data-roster-message]'),search=root.querySelector('[data-roster-search]'),division=root.querySelector('[data-roster-division]'),filter=root.querySelector('[data-roster-team-filter]'),list=root.querySelector('[data-roster-list]');
 const request=async(options)=>{const response=await fetch('/api/admin/players',{credentials:'same-origin',cache:'no-store',...options});const value=await response.json();if(!response.ok)throw new Error(value.error||'Unable to save roster.');return value;};
 const teams=()=>data.clubs[division.value]||[];
 function draw(resetFilter=false){
  if(resetFilter)filter.innerHTML=`<option value="all">All players</option><option value="free">Free agents</option>${teams().map(c=>`<option value="${escapeHtml(c.key)}">${escapeHtml(c.name)}</option>`).join('')}`;
  const visible=data.players.filter(p=>p.name.toLowerCase().includes(search.value.trim().toLowerCase())&&(filter.value==='all'||(filter.value==='free'?!p.memberships[division.value]?.team:p.memberships[division.value]?.team===filter.value)));
  root.querySelector('[data-roster-count]').textContent=`${visible.length} players`;
  list.innerHTML=visible.map(p=>{const team=p.memberships[division.value]?.team||'';return `<article class="roster-admin-row" data-roster-player="${escapeHtml(p.id)}"><div><strong>${escapeHtml(p.name)}</strong><small>${division.value} · ${escapeHtml(teams().find(c=>c.key===team)?.name||'Free agent')}</small></div><label>Assign team<select data-assignment><option value="">Free agent / release from team</option>${teams().map(c=>`<option value="${escapeHtml(c.key)}" ${c.key===team?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></label><button class="button button-secondary" data-save-assignment>Save assignment</button></article>`;}).join('')||'<p>No players match these filters.</p>';
 }
 async function load(reset=false){data=await request();if(root.isConnected)draw(reset);}
 search.addEventListener('input',()=>draw());filter.addEventListener('change',()=>draw());division.addEventListener('change',()=>draw(true));
 async function save(payload,success){
  if(busy)return false;busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);message.textContent='Saving…';
  try{await request({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});await refreshLeagueRosters(true);await load();message.textContent=success;return true;}catch(e){message.textContent=e.message;return false;}finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 root.querySelector('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;if(await save({action:'create',discordName:form.elements.discordName.value},'Player added to the pool. Choose their team below.')){search.value=form.elements.discordName.value.trim().replace(/^@/,'');filter.value='all';draw();form.reset();}});
 list.addEventListener('click',async event=>{const button=event.target.closest('[data-save-assignment]');if(!button)return;const row=button.closest('[data-roster-player]');await save({action:'assign',playerId:row.dataset.rosterPlayer,season:'2',division:division.value,team:row.querySelector('select').value||null},'Assignment saved. Public player and club rosters are updated.');});
 try{await load(true);}catch(e){message.textContent=e.message;}
}
