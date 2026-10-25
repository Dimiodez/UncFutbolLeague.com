// Navigation is only a convenience; every suite page, asset and API also checks roles server-side.
export async function installSuiteAccessControls(){
 const response=await fetch('/api/league-suite/access',{cache:'no-store'});if(!response.ok)return;const access=await response.json();
 const main=document.querySelector('main.workshop');if(!main)return;
 const panel=document.createElement('details');panel.className='workshop-boundary';panel.setAttribute('aria-label','League Suite access');
 const heading=document.createElement('summary');heading.textContent=access.owner?'Settings & administrator access':'Administrator access information';panel.append(heading);
 const description=document.createElement('p');description.textContent='Access settings only. Test results are collected separately from public standings. Original EA records are retained; changing this setting does not change league records.';panel.append(description);
 if(access.owner){const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=access.adminsEnabled;toggle.style.width='auto';label.append(toggle,' Allow website administrators to access and edit this test suite');const status=document.createElement('p');status.setAttribute('role','status');panel.append(label,status);toggle.onchange=async()=>{const enabled=toggle.checked;toggle.disabled=true;try{const r=await fetch('/api/league-suite/access',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({adminsEnabled:enabled})}),data=await r.json();if(!r.ok)throw Error(data.error);status.textContent=enabled?'Administrator testing enabled.':'Owner-only access restored.';}catch(error){toggle.checked=!enabled;status.textContent=error.message;}finally{toggle.disabled=false;}};}
 const settings=main.querySelector('.workspace-advanced');if(settings)settings.append(panel);else main.querySelector('.workshop-nav')?.after(panel);
}
