// Public portraits are keyed by player identity, not the team currently being viewed.
const leaguePlayerPhotoState={portraits:{},byIdentity:{}};
async function refreshPublishedPlayerPhotos(){
  const response=await fetch('/api/player-portraits',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw new Error('Unable to refresh published photos.');
  const data=await response.json();
  leaguePlayerPhotoState.portraits=data.portraits||{};leaguePlayerPhotoState.byIdentity=data.byIdentity||{};
  document.querySelectorAll('[data-player-photo-id]').forEach(art=>{
    const src=leaguePlayerPhotoState.portraits[art.dataset.playerPhotoId]||leaguePlayerPhotoState.byIdentity[art.dataset.playerPhotoIdentity];
    if(!src||art.querySelector('img')?.getAttribute('src')===src)return;
    const image=new Image();image.alt=art.dataset.playerPhotoName||'Player portrait';image.loading='lazy';image.decoding='async';
    image.onload=()=>{if(!art.isConnected)return;art.querySelector('img,.league-shirt-number')?.remove();art.prepend(image);};image.src=src;
  });
}
async function hydratePlayerPhotos(){
  try{await refreshPublishedPlayerPhotos();}catch{/* Keep the current photo if storage is unavailable. */}
  if(!location.pathname.startsWith('/players/'))return;
  const main=document.querySelector('main'),art=main?.querySelector('[data-player-photo-id]');
  if(!art||main.querySelector('[data-player-photo-panel]'))return;
  const playerId=art.dataset.playerPhotoId,auth=await getAuthState();if(!art.isConnected||!auth.user)return;
  let access;
  try{const response=await fetch(`/api/admin/player-photos?playerId=${encodeURIComponent(playerId)}`,{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;access=await response.json();}catch{return;}
  if(!art.isConnected||main.querySelector('[data-player-photo-panel]'))return;
  if(!access.canReview){managerPlayerPhotoForm(main,playerId,access);return;}
  const root=document.createElement('section');root.className='player-photo-review card';root.dataset.playerPhotoPanel='';
  root.innerHTML=`<span class="section-kicker">Admin photo publishing</span><h2>Player photo</h2><p>Choose a photo, check the preview, then publish. One photo follows this player across all their teams. No separate approval request.</p>
  <form class="photo-publish-form">
    <label class="photo-file-label">Choose player photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label>
    <small>JPEG, PNG or WebP · up to 5 MB. The preview stays on your device until you publish.</small>
    <div class="photo-editor" hidden><h3>Preview</h3><div class="photo-editor-layout">
      <div class="photo-canvas-wrap"><canvas width="512" height="640" aria-label="Player photo preview"></canvas><div class="photo-guides" aria-hidden="true"><span>+</span></div></div>
      <div class="photo-controls"><p>Ready to publish? Framing adjustments are optional.</p><details class="photo-framing"><summary>Adjust framing</summary>
        <label>Zoom<input type="range" min="0.001" max="5" step="0.001" value="1" data-photo-scale></label>
        <label>Horizontal position<input type="number" step="1" data-photo-x></label>
        <label>Vertical position<input type="number" step="1" data-photo-y></label>
        <label>Background<input type="color" value="#ffffff" data-photo-bg></label>
        <button type="button" class="button button-secondary" data-photo-reset>Reset framing</button>
      </details></div>
    </div></div>
    <div class="photo-primary-actions"><button type="submit" class="button button-primary" data-photo-publish disabled>Publish photo</button><button type="button" class="button button-secondary" data-photo-close hidden>Cancel preview</button><button type="button" class="button button-secondary" data-photo-reject hidden>Reject submission</button></div>
  </form><p class="photo-status" role="status" aria-live="polite">Choose a photo to preview it. Nothing changes until you publish.</p><div class="photo-pending-list"></div>`;
  main.querySelector('.league-explorer')?.append(root);
  const editor=root.querySelector('.photo-editor'),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),form=root.querySelector('form'),fileInput=root.querySelector('input[type=file]'),publish=root.querySelector('[data-photo-publish]'),close=root.querySelector('[data-photo-close]'),reject=root.querySelector('[data-photo-reject]'),list=root.querySelector('.photo-pending-list');
  const scale=root.querySelector('[data-photo-scale]'),xInput=root.querySelector('[data-photo-x]'),yInput=root.querySelector('[data-photo-y]'),bg=root.querySelector('[data-photo-bg]');
  let photos=[],selected=null,sourceFile=null,image=null,busy=false,drag=null,selection=0,state={x:0,y:0,scale:1};
  const message=(text,error=false)=>{const status=root.querySelector('.photo-status');status.textContent=text;status.classList.toggle('photo-error',error);};
  const lock=value=>{busy=value;root.querySelectorAll('input,button').forEach(control=>control.disabled=value);publish.disabled=value||!image;};
  const request=async(url,options)=>{const response=await fetch(url,{credentials:'same-origin',...options});const data=await response.json();if(!response.ok)throw new Error(data.error||'Photo request failed.');return data;};
  const draw=()=>{ctx.fillStyle=bg.value;ctx.fillRect(0,0,512,640);if(image)ctx.drawImage(image,state.x,state.y,image.width*state.scale,image.height*state.scale);xInput.value=Math.round(state.x);yInput.value=Math.round(state.y);};
  const reset=()=>{if(!image)return;state.scale=Math.min(512/image.width,640/image.height);scale.max=Math.max(5,state.scale*4);scale.value=state.scale;state.x=(512-image.width*state.scale)/2;state.y=(640-image.height*state.scale)/2;draw();};
  const clear=(keepFile=false)=>{selection++;image?.close();image=null;selected=null;sourceFile=null;if(!keepFile)fileInput.value='';editor.hidden=true;close.hidden=true;reject.hidden=true;publish.disabled=true;};
  async function preview(blob,submission=null){
    const attempt=++selection,next=await createImageBitmap(blob);
    if(attempt!==selection||!root.isConnected){next.close();return;}
    if(next.width*next.height>64000000){next.close();throw new Error('This photo is too large to preview. Choose a smaller image.');}
    image?.close();image=next;selected=submission;sourceFile=submission?null:blob;if(submission)fileInput.value='';editor.hidden=false;close.hidden=false;reject.hidden=!submission||submission.status!=='pending';bg.value='#ffffff';reset();publish.disabled=false;
    message('Preview ready. Publish photo updates every team page for this player.');
  }
  async function load(){
    const data=await request(`/api/admin/player-photos?playerId=${encodeURIComponent(playerId)}`);if(!root.isConnected)return;
    photos=data.photos||[];
    const pending=photos.filter(photo=>photo.status==='pending'),reviewed=photos.filter(photo=>photo.status!=='pending');
    const items=rows=>rows.map(photo=>photo.originalUrl?`<button type="button" class="photo-review-item" data-photo-open="${escapeHtml(photo.id)}">${photo.status==='pending'?'Preview submission':'Edit saved photo'} · ${escapeHtml(new Date(photo.created_at+'Z').toLocaleString())}</button>`:'<p>Original removed; the current published photo is unchanged.</p>').join('');
    list.innerHTML=(pending.length?`<details open><summary>Team submissions awaiting review (${pending.length})</summary>${items(pending)}</details>`:'')+(reviewed.length?`<details><summary>Photo history (${reviewed.length})</summary>${items(reviewed)}<button type="button" class="button button-secondary" data-photo-cleanup>Remove reviewed originals & old photos</button><p>The current published photo and pending submissions are kept.</p></details>`:'');
  }
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files[0];if(!file||busy)return;
    clear(true);if(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type)){message('Choose a JPEG, PNG or WebP up to 5 MB.',true);return;}
    lock(true);message('Preparing local preview…');
    try{await preview(file);}catch(error){message(error.message,true);}finally{lock(false);}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!image||busy)return;lock(true);message('Publishing photo…');let published=false;
    try{
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Unable to prepare the portrait.');
      const body=new FormData();body.set('portrait',blob,'portrait.png');
      if(selected){body.set('action','approve');await request(`/api/admin/player-photos/${selected.id}`,{method:'POST',body});}
      else{body.set('playerId',playerId);body.set('photo',sourceFile,sourceFile.name||'original');await request('/api/admin/player-photos/publish',{method:'POST',body});}
      published=true;clear();await Promise.all([load(),refreshPublishedPlayerPhotos()]);message('Photo published for this player across all teams. The original is private.');
    }catch(error){message(published?'Photo published. Reload the page to see the updated image.':error.message,!published);}finally{lock(false);}
  });
  list.addEventListener('click',async event=>{
    if(busy)return;
    if(event.target.closest('[data-photo-cleanup]')){
      if(!confirm('Permanently remove reviewed originals and older photos? The current published photo and pending submissions will stay.'))return;
      lock(true);try{const body=new FormData();body.set('action','cleanup');body.set('playerId',playerId);await request('/api/admin/player-photos',{method:'POST',body});clear();await load();message('Reviewed originals and old photos removed. Current photo and pending submissions kept.');}catch(error){message(error.message,true);}finally{lock(false);}return;
    }
    const button=event.target.closest('[data-photo-open]'),chosen=photos.find(photo=>photo.id===button?.dataset.photoOpen);if(!chosen)return;
    lock(true);message('Loading private submission…');
    try{const response=await fetch(chosen.originalUrl,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Unable to load the private original.');await preview(await response.blob(),chosen);}catch(error){message(error.message,true);}finally{lock(false);}
  });
  scale.addEventListener('input',()=>{if(!image)return;const next=Number(scale.value),ratio=next/state.scale;state.x=256-(256-state.x)*ratio;state.y=320-(320-state.y)*ratio;state.scale=next;draw();});
  xInput.addEventListener('input',()=>{state.x=Number(xInput.value)||0;draw();});yInput.addEventListener('input',()=>{state.y=Number(yInput.value)||0;draw();});bg.addEventListener('input',draw);
  canvas.addEventListener('pointerdown',event=>{if(!image||busy)return;canvas.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY,startX:state.x,startY:state.y};});
  canvas.addEventListener('pointermove',event=>{if(!drag)return;const bounds=canvas.getBoundingClientRect();state.x=drag.startX+(event.clientX-drag.x)*512/bounds.width;state.y=drag.startY+(event.clientY-drag.y)*640/bounds.height;draw();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  root.querySelector('[data-photo-reset]').addEventListener('click',reset);
  close.addEventListener('click',()=>{if(busy)return;clear();message('Preview cancelled. The published photo is unchanged.');});
  reject.addEventListener('click',async()=>{if(!selected||busy)return;lock(true);try{const body=new FormData();body.set('action','reject');await request(`/api/admin/player-photos/${selected.id}`,{method:'POST',body});clear();await load();message('Submission rejected. The published photo is unchanged.');}catch(error){message(error.message,true);}finally{lock(false);}});
  try{await load();}catch(error){message(error.message,true);}
}

function managerPlayerPhotoForm(main,playerId,access){
 const root=document.createElement('section');root.className='player-photo-review card';root.dataset.playerPhotoPanel='';
 root.innerHTML='<span class="section-kicker">Team manager</span><h2>Submit player photo</h2><p>Photos remain private until an owner or administrator formats and approves them. The current public portrait stays unchanged.</p><form class="photo-upload-form"><label>Player photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label><button class="button button-primary">Submit for approval</button><small>JPEG, PNG or WebP · up to 5 MB</small></form><p class="photo-status" role="status" aria-live="polite"></p>';
 main.querySelector('.league-explorer')?.append(root);
 const status=root.querySelector('.photo-status');
 status.textContent=`${access.photos.filter(photo=>photo.status==='pending').length} photos awaiting staff review.`;
 root.querySelector('form').addEventListener('submit',async event=>{
  event.preventDefault();const button=root.querySelector('button'),form=new FormData(event.currentTarget);form.set('playerId',playerId);button.disabled=true;
  try{const response=await fetch('/api/admin/player-photos',{method:'POST',credentials:'same-origin',body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||'Upload failed.');status.textContent='Submitted privately. An owner or administrator must approve it before publication.';event.target.reset();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 });
}

const leagueTeamMediaState={teams:{},loadedAt:0};
async function hydrateTeamMedia(){
 const main=document.querySelector('main');
 if(Date.now()-leagueTeamMediaState.loadedAt>15000){
  leagueTeamMediaState.loadedAt=Date.now();
  try{const response=await fetch('/api/team-media',{cache:'no-store'});if(response.ok){const data=await response.json();if(JSON.stringify(data.teams)!==JSON.stringify(leagueTeamMediaState.teams)){leagueTeamMediaState.teams=data.teams||{};if(main===document.querySelector('main'))render();return;}}}catch{/* Preserve current artwork when storage is unavailable. */}
 }
 if(!location.pathname.startsWith('/clubs/'))return;
 const params=new URLSearchParams(location.search),context=leagueViewContext(params);if(context.selected.id!=='2')return;
 const requested=decodeURIComponent(location.pathname.slice('/clubs/'.length)),team=context.clubAliases?.[requested]||requested,division=context.division;
 const host=main?.querySelector('.league-explorer');if(!host||host.querySelector('[data-team-media-panel]'))return;
 const auth=await getAuthState();if(!auth.user||!host.isConnected)return;
 const endpoint=`/api/team-media/manage?division=${encodeURIComponent(division)}&team=${encodeURIComponent(team)}`;
 let access;try{const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;access=await response.json();}catch{return;}
 if(!host.isConnected||host.querySelector('[data-team-media-panel]'))return;
 const root=document.createElement('section');root.className='player-photo-review card';root.dataset.teamMediaPanel='';
 root.innerHTML='<span class="section-kicker">Team image management</span><h2>Logo & stadium</h2><p>Logos and stadium photos publish immediately as uploaded. Player photos require owner/admin approval on the player’s page.</p><form class="photo-upload-form" data-team-upload><label>Image type<select name="kind"><option value="logo">Club logo</option><option value="stadium">Stadium photo</option></select></label><label>Choose image<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label><button class="button button-primary">Upload & publish</button><small>JPEG, PNG or WebP · up to 5 MB</small></form><p class="photo-status" role="status" aria-live="polite"></p><div data-team-managers></div>';
 host.append(root);const status=root.querySelector('.photo-status'),managerRoot=root.querySelector('[data-team-managers]');
 const request=async form=>{form.set('division',division);form.set('team',team);const response=await fetch('/api/team-media/manage',{method:'POST',credentials:'same-origin',body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to update team images.');return data;};
 root.querySelector('[data-team-upload]').addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;const form=new FormData(event.target);form.set('action','upload');try{await request(form);leagueTeamMediaState.loadedAt=0;await hydrateTeamMedia();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
 function managers(){
  if(!access.canManageManagers)return;
  managerRoot.innerHTML=`<h3>Team manager image access</h3><p>Grant access to an existing signed-in member for this team and division only. This allows logo/stadium changes and player photo submissions, not player approval or administrator powers.</p><form class="photo-upload-form" data-grant-manager><label>Member<select name="discordId" required><option value="">Choose member…</option>${access.users.map(user=>`<option value="${escapeHtml(user.discord_id)}">${escapeHtml(user.display_name)} · ${escapeHtml(user.username)}</option>`).join('')}</select></label><button class="button button-secondary">Grant team access</button></form>${access.managers.map(manager=>`<p>${escapeHtml(manager.display_name)} <button type="button" class="tab" data-revoke-manager="${escapeHtml(manager.discord_id)}">Remove image access</button></p>`).join('')}`;
 }
 async function updateManagers(form){try{await request(form);const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Reload to see manager access.');access=await response.json();managers();status.textContent='Team image access updated.';}catch(error){status.textContent=error.message;}}
 managerRoot.addEventListener('submit',async event=>{event.preventDefault();const form=new FormData(event.target);form.set('action','grant');await updateManagers(form);});
 managerRoot.addEventListener('click',async event=>{const button=event.target.closest('[data-revoke-manager]');if(!button)return;button.disabled=true;const form=new FormData();form.set('action','revoke');form.set('discordId',button.dataset.revokeManager);await updateManagers(form);button.disabled=false;});
 managers();
}
