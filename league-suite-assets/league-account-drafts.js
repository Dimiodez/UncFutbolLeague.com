// Explicit account saves: browser work is never silently replaced or published.
export function installAccountDrafts({getData,loadData,saveLocal,hasUnappliedChanges,onSaved,recoverLocal}){
 const panel=document.createElement('section');panel.className='card account-drafts';panel.innerHTML='<h2>My Discord account drafts</h2><p>Save all your leagues, seasons and cup drafts together. Open them here on another device using the same Discord account. This does not publish anything.</p><div class="workshop-toolbar"><button type="button" data-account-save disabled>Save drafts online</button><button type="button" data-account-load disabled>Open account drafts</button><a href="/api/auth/discord">Sign in with Discord</a><button type="button" data-account-refresh>Refresh account status</button></div><p role="status" aria-live="polite">Checking your account…</p>';
 document.querySelector('.league-page').before(panel);
 const recovery=document.createElement('button');recovery.type='button';recovery.textContent='Recover browser backup';panel.querySelector('.workshop-toolbar').append(recovery);
 recovery.onclick=()=>{if(!confirm('Restore the browser backup from before the last account draft opening? This does not change your online drafts.'))return;try{recoverLocal();say('Recovered browser backup on this device. Save online only if you want to replace your account drafts.');}catch(error){say(error.message);}};
 const save=panel.querySelector('[data-account-save]'),open=panel.querySelector('[data-account-load]'),refresh=panel.querySelector('[data-account-refresh]'),login=panel.querySelector('a'),status=panel.querySelector('[role="status"]');
 let account=null,revision=null,baseline=null,remoteExists=false,attached=false,conflict=false,busy=false;
 const say=text=>status.textContent=text;
 const controls=()=>{save.disabled=busy||!account||conflict;open.disabled=busy||!account||!remoteExists;refresh.disabled=busy;login.hidden=!!account;};
 const request=async body=>{const r=await fetch('/api/league-suite/drafts',body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{});const data=await r.json();if(!r.ok){const error=Error(data.error||'Account drafts unavailable.');error.status=r.status;throw error;}return data;};
 async function check(){busy=true;controls();try{const data=await request();account=data.account;revision=data.revision;remoteExists=!!data.draft;baseline=data.draft?JSON.stringify(data.draft):null;attached=baseline===JSON.stringify(getData());conflict=false;say(`${account.name} · ${remoteExists?'Account drafts available. Open them to continue, or save to replace them.':'No account drafts saved yet. Save your current workspace online.'}`);}catch(error){account=null;say(error.message);}finally{busy=false;controls();}}
 save.onclick=async()=>{
  if(hasUnappliedChanges()){say('Apply or cancel your open form changes before saving online.');return;}
  const snapshot=getData(),serialized=JSON.stringify(snapshot);
  if(remoteExists&&!attached&&baseline!==serialized&&!confirm('Replace the drafts saved to your Discord account with this workspace? This saves all current leagues, seasons and cups together.'))return;
  busy=true;controls();try{saveLocal();const data=await request({accountId:account.id,revision,draft:snapshot});revision=data.revision;remoteExists=true;attached=true;baseline=serialized;if(JSON.stringify(getData())===serialized&&!hasUnappliedChanges()){onSaved();say(`Saved online · ${account.name} · ${new Date().toLocaleTimeString()} · Available on your other devices.`);}else say('The submitted workspace was saved online. You made newer changes while it saved; save again to include them.');}catch(error){if(error.status===409)conflict=true;say(error.message);}finally{busy=false;controls();}
 };
 open.onclick=async()=>{
  if(!confirm('Open your Discord account drafts in this browser? Your current browser workspace will be backed up on this device first. Unapplied form edits are not included in that backup.'))return;
  busy=true;controls();try{const data=await request();if(data.account.id!==account.id)throw Error('Your signed-in account changed. Refresh account status first.');if(!data.draft)throw Error('No account drafts saved yet.');loadData(data.draft);revision=data.revision;remoteExists=true;attached=true;baseline=JSON.stringify(data.draft);conflict=false;onSaved();say(`Opened account drafts · ${account.name} · Browser backup kept on this device.`);}catch(error){say(error.message);}finally{busy=false;controls();}
 };
 refresh.onclick=check;
 check();
 return {changed(){if(account&&!busy)say('Saved on this device · Use Save drafts online to update your Discord account.');}};
}
