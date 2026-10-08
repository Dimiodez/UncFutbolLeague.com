import {zonedTimestamp,leagueWindowState} from './league-engine.js';
export const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function registrationSummary(settings,open,now=Date.now()){
 if(!open)return 'Registration closed';
 const windows=(settings.windows||[]).filter(w=>w.type==='registration');
 if(!windows.length)return 'Registration open · no closing date set';
 const active=windows.find(w=>leagueWindowState(w,settings.timeZone,now)==='open');
 if(!active){const next=windows.filter(w=>w.from>new Intl.DateTimeFormat('en-CA',{timeZone:settings.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now)).sort((a,b)=>a.from.localeCompare(b.from))[0];return next?`Registration opens ${next.from}`:'Registration window closed';}
 const end=new Date(active.to+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+1);const hours=Math.ceil((zonedTimestamp(end.toISOString().slice(0,10),'00:00',settings.timeZone)-now)/3600000);
 return `Registration closes in ${hours>24?`${Math.ceil(hours/24)} days`:`${hours} hour${hours===1?'':'s'}`} · ${active.to} (${settings.timeZone})`;
}
export function nextFixture(draft,teamIds=null,now=Date.now()){
 const accepted=new Set((draft.acceptedResults||[]).map(r=>r.fixtureId));return (draft.fixtures||[]).filter(f=>f.startsAt>=now&&!accepted.has(f.id)&&(!teamIds||teamIds.includes(f.home.id)||teamIds.includes(f.away.id))).sort((a,b)=>a.startsAt-b.startsAt)[0]||null;
}
export function nextMatchText(draft,teamIds){const f=nextFixture(draft,teamIds);return f?`${f.home.name} vs ${f.away.name} · ${new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short',timeZone:draft.settings.timeZone}).format(f.startsAt)} (${draft.settings.timeZone})`:'No upcoming fixture on this device';}
export const statusBadge=status=>`<span class="registration-status ${status==='approved'?'is-approved':'is-pending'}">${status==='approved'?'Approved':'Pending approval'}</span>`;
export function watchUnsaved(root,initial='Saved on this device'){
 const badge=document.createElement('p');badge.className='save-state';badge.setAttribute('role','status');badge.textContent=initial;root.prepend(badge);
 root.addEventListener('input',event=>{const form=event.target.closest('form');if(form&&(!root.matches('main')||!event.target.closest('[data-shared]'))){form.dataset.unsaved='true';badge.textContent='Unsaved changes';}});return text=>{if(!root.matches('main')&&text.startsWith('Saved')){if(root.matches('form'))delete root.dataset.unsaved;root.querySelectorAll('form[data-unsaved]').forEach(form=>delete form.dataset.unsaved);}badge.textContent=root.matches('main')&&root.querySelector('form[data-unsaved="true"]:not([data-shared] form)')?'Unsaved changes':text;};
}
export function invitationCard(host,url,{league,season,kind='Manager',teamName=''}){
 host.replaceChildren();const wrap=document.createElement('div');wrap.className='invitation-card';wrap.innerHTML=`<strong>${escape(kind)} invitation${teamName?` · ${escape(teamName)}`:''}</strong><p>${escape(league)} · ${escape(season)}</p><div class="workshop-toolbar"><button type="button" data-preview>Preview invitation</button><button type="button" data-copy>Copy link</button><a href="${escape(url)}" target="_blank" rel="noopener">Open invitation</a></div><p role="status" data-copy-status></p><dialog class="league-editor-dialog"><h2>Invitation preview</h2><p>${escape(league)} · ${escape(season)}${teamName?` · ${escape(teamName)}`:''}</p><p>${kind==='Player'?'Register with Discord and your public gaming ID, then request to join this team. League staff approve your membership.':'Sign in with Discord. A league admin must authorize you as a Team Manager before you submit your displayed/in-game team names and public gaming ID.'}</p><p>Preview registration only. This does not register anyone on the live website or bot.</p><button type="button" data-close>Close preview</button></dialog>`;
 host.append(wrap);const dialog=wrap.querySelector('dialog');wrap.querySelector('[data-preview]').onclick=()=>dialog.showModal();wrap.querySelector('[data-close]').onclick=()=>dialog.close();wrap.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(url);wrap.querySelector('[data-copy-status]').textContent='Link copied.';}catch{wrap.querySelector('[data-copy-status]').textContent='Could not copy automatically. Open the invitation and copy its address.';}};
}
