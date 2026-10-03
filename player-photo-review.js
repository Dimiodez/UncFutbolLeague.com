// Originals are private. Only explicit staff approval updates public portraits.
async function hydratePlayerPhotos(){
  const main=document.querySelector('main');
  try{
    const response=await fetch('/api/player-portraits',{credentials:'same-origin',cache:'no-store'});
    if(response.ok){const {portraits={}}=await response.json();
      document.querySelectorAll('[data-player-photo-id]').forEach(art=>{
        const src=portraits[art.dataset.playerPhotoId];if(!src)return;
        const image=new Image();image.alt=art.dataset.playerPhotoName||'Player portrait';image.loading='lazy';
        image.onload=()=>{if(!art.isConnected)return;art.querySelector('img,.league-shirt-number')?.remove();art.prepend(image);};image.src=src;
      });
    }
  }catch{/* Keep the existing portraits when storage is unavailable. */}
  if(!location.pathname.startsWith('/players/'))return;
  const art=main?.querySelector('[data-player-photo-id]');if(!art)return;
  const playerId=art.dataset.playerPhotoId;
  const auth=await getAuthState();if(!art.isConnected||!['owner','admin'].includes(auth.user?.role))return;
  const root=document.createElement('section');root.className='player-photo-review card';
  root.innerHTML=`<span class="section-kicker">Admin / owner only</span><h2>Player photo review</h2><p>Upload an original privately, then crop and approve a 512 × 640 PNG. The existing public portrait stays unchanged until approval. This formats a photo; it does not generate an illustrated character or remove its background.</p><form class="photo-upload-form"><label>Original photo <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label><button class="button button-primary">Upload for review</button><small>JPEG, PNG or WebP · up to 5 MB</small></form><p class="photo-status" role="status" aria-live="polite"></p><div class="photo-pending-list"></div><div class="photo-editor" hidden><h3>Format portrait</h3><p>Drag freely to move. Use scale to zoom. Guides are not included in the final image.</p><div class="photo-editor-layout"><div class="photo-canvas-wrap"><canvas width="512" height="640" aria-label="Portrait cropping preview"></canvas><div class="photo-guides" aria-hidden="true"><span>+</span></div></div><div class="photo-controls"><label>Scale <input type="range" min="0.05" max="5" step="0.01" value="1" data-photo-scale></label><label>Horizontal <input type="number" step="1" data-photo-x></label><label>Vertical <input type="number" step="1" data-photo-y></label><label>Background <input type="color" value="#091a2e" data-photo-bg></label><button type="button" class="button button-secondary" data-photo-reset>Reset framing</button><button type="button" class="button button-primary" data-photo-approve>Approve & publish portrait</button><button type="button" class="button button-secondary" data-photo-reject>Reject pending photo</button><button type="button" class="button button-secondary" data-photo-close>Close editor</button></div></div></div>`;
  main.querySelector('.league-explorer')?.append(root);
  const status=root.querySelector('.photo-status'),list=root.querySelector('.photo-pending-list'),editor=root.querySelector('.photo-editor'),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
  const scale=root.querySelector('[data-photo-scale]'),xInput=root.querySelector('[data-photo-x]'),yInput=root.querySelector('[data-photo-y]'),bg=root.querySelector('[data-photo-bg]');
  let photos=[],selected=null,image=null,state={x:0,y:0,scale:1},drag=null,busy=false;
  const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('photo-error',error);};
  const lock=value=>{busy=value;root.querySelectorAll('button').forEach(button=>button.disabled=value);};
  const request=async(url,options)=>{const response=await fetch(url,{credentials:'same-origin',...options});const data=await response.json();if(!response.ok)throw new Error(data.error||'Photo request failed.');return data;};
  const draw=()=>{ctx.fillStyle=bg.value;ctx.fillRect(0,0,512,640);if(image)ctx.drawImage(image,state.x,state.y,image.width*state.scale,image.height*state.scale);xInput.value=Math.round(state.x);yInput.value=Math.round(state.y);};
  const reset=()=>{if(!image)return;state.scale=Math.min(512/image.width,640/image.height);scale.value=state.scale;state.x=(512-image.width*state.scale)/2;state.y=(640-image.height*state.scale)/2;draw();};
  async function load(){
    const data=await request(`/api/admin/player-photos?playerId=${encodeURIComponent(playerId)}`);if(!root.isConnected)return;
    photos=data.photos;list.innerHTML=photos.length?`<h3>Saved uploads</h3>${photos.map(p=>`<button type="button" class="photo-review-item" data-photo-open="${escapeHtml(p.id)}">${escapeHtml(p.status)} · ${escapeHtml(new Date(p.created_at+'Z').toLocaleString())} · Review original</button>`).join('')}`:'<p>No photos submitted for this player yet.</p>';
  }
  root.querySelector('form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const file=root.querySelector('input[type=file]').files[0];if(!file||file.size>5*1024*1024){message('Choose a photo up to 5 MB.',true);return;}
    const form=new FormData();form.set('playerId',playerId);form.set('photo',file);lock(true);message('Uploading privately…');
    try{await request('/api/admin/player-photos',{method:'POST',body:form});await load();message('Saved privately. You can close this page and format it later.');root.querySelector('form').reset();}catch(error){message(error.message,true);}finally{lock(false);}
  });
  list.addEventListener('click',async event=>{
    const button=event.target.closest('[data-photo-open]');if(!button||busy)return;
    const chosen=photos.find(p=>p.id===button.dataset.photoOpen);lock(true);message('Loading private original…');
    try{const response=await fetch(chosen.originalUrl,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Unable to load private original.');
      const next=await createImageBitmap(await response.blob());if(next.width*next.height>64000000){next.close();throw new Error('Image is too large to edit safely. Choose a smaller image.');}
      image?.close();image=next;selected=chosen;editor.hidden=false;reset();message('Reviewing private original. Nothing has been published.');
    }catch(error){message(error.message,true);}finally{lock(false);}
  });
  scale.addEventListener('input',()=>{const next=Number(scale.value),ratio=next/state.scale;state.x=256-(256-state.x)*ratio;state.y=320-(320-state.y)*ratio;state.scale=next;draw();});
  xInput.addEventListener('input',()=>{state.x=Number(xInput.value)||0;draw();});yInput.addEventListener('input',()=>{state.y=Number(yInput.value)||0;draw();});bg.addEventListener('input',draw);
  canvas.addEventListener('pointerdown',event=>{if(!image)return;canvas.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY,startX:state.x,startY:state.y};});
  canvas.addEventListener('pointermove',event=>{if(!drag)return;const bounds=canvas.getBoundingClientRect();state.x=drag.startX+(event.clientX-drag.x)*512/bounds.width;state.y=drag.startY+(event.clientY-drag.y)*640/bounds.height;draw();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  root.querySelector('[data-photo-reset]').addEventListener('click',reset);
  root.querySelector('[data-photo-close]').addEventListener('click',()=>{editor.hidden=true;image?.close();image=null;selected=null;});
  root.querySelector('[data-photo-approve]').addEventListener('click',async()=>{
    if(!selected||!image||busy)return;if(!confirm('Publish this formatted portrait? It will replace the public image for this player.'))return;
    lock(true);message('Publishing approved portrait…');
    try{const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Could not create portrait.');const form=new FormData();form.set('action','approve');form.set('portrait',blob,'portrait.png');await request(`/api/admin/player-photos/${selected.id}`,{method:'POST',body:form});await load();message('Approved and published. The original remains private.');
      const next=new Image();next.alt=art.dataset.playerPhotoName;next.onload=()=>{art.querySelector('img,.league-shirt-number')?.remove();art.prepend(next);};next.src=`/api/player-portraits/${encodeURIComponent(playerId)}?v=${Date.now()}`;
    }catch(error){message(error.message,true);}finally{lock(false);}
  });
  root.querySelector('[data-photo-reject]').addEventListener('click',async()=>{
    if(!selected||busy)return;lock(true);try{const form=new FormData();form.set('action','reject');await request(`/api/admin/player-photos/${selected.id}`,{method:'POST',body:form});await load();editor.hidden=true;message('Marked rejected. Existing public portrait is unchanged.');}catch(error){message(error.message,true);}finally{lock(false);}
  });
  try{await load();}catch(error){message(error.message,true);}
}
