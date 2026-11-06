document.addEventListener('DOMContentLoaded',()=>{
 const status=document.querySelector('#intl-admin-status');
 async function save(body,button){if(button)button.disabled=true;try{const response=await fetch('/api/internationals',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),data=await response.json();if(!response.ok)throw Error(data.error||'Could not save the roster.');location.reload();}catch(error){if(status)status.textContent=error.message;else alert(error.message);if(button)button.disabled=false;}}
 document.querySelector('#intl-add-player')?.addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget,data=new FormData(form);save({action:'addRoster',teamId:data.get('teamId'),playerId:data.get('playerId'),name:data.get('name')},form.querySelector('button'));});
 document.querySelectorAll('[data-remove-roster]').forEach(button=>button.addEventListener('click',()=>{if(confirm('Remove this player from the national roster? Their profile and club memberships will remain saved.'))save({action:'deactivateRoster',rosterId:button.dataset.removeRoster},button);}));
});
