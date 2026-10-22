// Display preference only. Scheduling inputs and stored kickoff timestamps are unchanged.
(() => {
 const zones=[['America/New_York','Eastern'],['America/Chicago','Central'],['America/Denver','Mountain'],['America/Los_Angeles','Pacific'],['Europe/London','UK'],['UTC','UTC']];
 const key='ufl-display-timezone';
 function zone(){try{const saved=localStorage.getItem(key);return zones.some(([id])=>id===saved)?saved:zones[0][0];}catch{return zones[0][0];}}
 function format(value,options={}){const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',...options,timeZone:zone()}).format(date):'Time to be announced';}
 function refresh(){document.querySelectorAll('[data-ufl-time]').forEach(el=>el.textContent=format(el.dataset.uflTime));document.querySelectorAll('[data-time-preference]').forEach(el=>el.value=zone());window.dispatchEvent(new Event('ufl-timezone-change'));}
 function control(host){if(!host||host.querySelector('[data-time-preference]'))return;const label=document.createElement('label');label.className='time-preference';label.textContent='Display times ';const select=document.createElement('select');select.dataset.timePreference='';select.setAttribute('aria-label','Display timezone');for(const [id,name] of zones){const option=new Option(name,id);select.append(option);}select.value=zone();select.onchange=()=>{try{localStorage.setItem(key,select.value);}catch{}refresh();};label.append(select);host.append(label);}
 window.UFLTime={zone,format,control,refresh};
 window.addEventListener('storage',event=>{if(event.key===key)refresh();});
})();
