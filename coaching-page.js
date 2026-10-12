(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=value=>new Date(value.replace(' ','T')+'Z').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  const pathFor=id=>`/coaching/${id}`;
  const isStaff=user=>['owner','admin'].includes(user?.role);
  window.coachingPage=()=>`<section class="coach-page" id="coach-page"><header class="coach-hero"><div><span class="section-kicker">UFL · From the touchline</span><h1>COACHING</h1><p>A little know-how. A better next match.<br>Guides from the people you play with.</p></div><div class="coach-board" aria-hidden="true"><span class="coach-board-ring"></span><i>×</i><b>○</b><em>↗</em></div></header><div id="coach-content" aria-live="polite"><p>Loading the coaching room…</p></div><p id="coach-message" class="coach-message" role="status"></p></section>`;
  window.hydrateCoaching=async()=>{
    window.disposeCoaching?.();
    const root=document.querySelector('#coach-page');if(!root)return;
    const content=root.querySelector('#coach-content'),message=root.querySelector('#coach-message');
    const controller=new AbortController();let dirty=false,previewUrl=null,user=null,page=1,view='all',posts=[],hasMore=false;
    const cleanup=()=>{controller.abort();if(previewUrl)URL.revokeObjectURL(previewUrl);};window.disposeCoaching=cleanup;
    const report=(text,error=false)=>{if(!root.isConnected)return;message.textContent=text;message.classList.toggle('coach-error',error);};
    window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}},{signal:controller.signal});
    document.addEventListener('click',event=>{const link=event.target.closest('a[data-link]');if(dirty&&link&&new URL(link.href).pathname!==location.pathname&&!confirm('Leave this guide without saving your changes?')){event.preventDefault();event.stopImmediatePropagation();}},{capture:true,signal:controller.signal});
    const api=async(url,options={})=>{
      const response=await fetch(url,{credentials:'same-origin',...options});let data;
      try{data=await response.json();}catch{throw new Error('Coaching could not load. Please try again.');}
      if(!response.ok)throw new Error(data.error||'The request could not be completed.');return data;
    };
    const button=(label,action,extra='')=>`<button type="button" class="coach-button" data-coach-action="${action}" ${extra}>${label}</button>`;
    const signin=()=>'<a href="/account" data-link class="coach-button coach-primary">Sign in with Discord</a>';
    const heart=post=>`<button type="button" class="coach-heart ${post.hearted?'is-hearted':''}" data-heart="${post.id}" aria-pressed="${post.hearted}" aria-label="${post.hearted?'Remove heart from':'Heart'} ${esc(post.title)}" ${user?'':'disabled'}><span aria-hidden="true">${post.hearted?'♥':'♡'}</span> <span data-heart-count>${post.hearts}</span></button>`;
    const card=post=>`<article class="coach-card"><a href="${pathFor(post.id)}" data-link class="coach-card-link"><img src="${esc(post.coverUrl)}" alt="" loading="lazy" width="800" height="450"><div class="coach-card-copy"><span class="coach-eyebrow">${post.status==='hidden'?'Hidden · Author & staff only':'Community guide'}</span><h2>${esc(post.title)}</h2><p>${esc(post.hook)}</p></div></a><footer><span>By ${esc(post.author)}<small>${date(post.createdAt)}</small></span>${heart(post)}</footer></article>`;
    function bindHearts(){
      content.querySelectorAll('[data-heart]').forEach(element=>element.addEventListener('click',async()=>{
        element.disabled=true;report('');
        try{const data=await api(`/api/coaching/${element.dataset.heart}/heart`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hearted:element.getAttribute('aria-pressed')!=='true'})});
          element.setAttribute('aria-pressed',String(data.hearted));element.classList.toggle('is-hearted',data.hearted);element.querySelector('[aria-hidden]').textContent=data.hearted?'♥':'♡';element.querySelector('[data-heart-count]').textContent=data.hearts;
          element.setAttribute('aria-label',element.getAttribute('aria-label').replace(/^(Remove heart from|Heart)/,data.hearted?'Remove heart from':'Heart'));
        }catch(error){report(error.message,true);}finally{element.disabled=false;}
      }));
    }
    async function feed(append=false){
      if(!append){page=1;posts=[];content.innerHTML='<p>Loading guides…</p>';}
      try{
        const data=await api(`/api/coaching?view=${view}&page=${page}`);if(!root.isConnected)return;
        posts.push(...data.posts);hasMore=data.hasMore;renderFeed();
      }catch(error){report(error.message,true);content.innerHTML=button('Try again','retry');content.querySelector('button').onclick=()=>feed();}
    }
    function renderFeed(){
      content.innerHTML=`<div class="coach-toolbar"><div><h2>The coaching room</h2><p>Read it. Try it. Pass it on.</p></div>${user?'<a href="/coaching/new" data-link class="coach-button coach-primary">＋ Write a guide</a>':signin()}</div>${user?`<div class="coach-tabs" role="group" aria-label="Guide view">${[['all','All guides'],['mine','My guides'],...(isStaff(user)?[['moderation','Hidden guides']]:[])].map(([key,label])=>button(label,'view',`data-view="${key}" aria-pressed="${view===key}"`)).join('')}</div>`:'<p class="coach-signin-note">Everyone can read. Sign in to publish a guide or leave a heart.</p>'}<div class="coach-grid">${posts.map(card).join('')||`<div class="coach-empty"><div class="coach-empty-mark" aria-hidden="true">＋</div><span class="section-kicker">${view==='all'?'An open playbook':'Your coaching room'}</span><h3>${view==='moderation'?'No hidden guides.':view==='mine'?'Your first guide starts here.':'The first chapter is yours.'}</h3><p>${view==='moderation'?'Guides hidden by staff will appear here for review.':view==='mine'?'Share a title, a hook, a cover image and your know-how.':"No guides have been posted yet. When the community starts sharing, you’ll find their playbooks here."}</p>${view==='moderation'?'':user?'<a href="/coaching/new" data-link class="coach-button coach-primary">Write a guide</a>':signin()}</div>`}</div>${hasMore?button('Load more guides','more'):''}`;
      content.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{view=el.dataset.view;feed();});
      const more=content.querySelector('[data-coach-action="more"]');if(more)more.onclick=async()=>{more.disabled=true;page++;await feed(true);};bindHearts();
    }
    async function showGuide(id){
      const {post}=await api(`/api/coaching/${id}`);if(!root.isConnected)return;
      document.title=`${post.title} · UFL Coaching`;
      content.innerHTML=`<a href="/coaching" data-link class="coach-back">← All guides</a><article class="coach-article"><header><span class="coach-eyebrow">${post.status==='hidden'?'Hidden · Author & staff only':'Community guide'}</span><h2>${esc(post.title)}</h2><p class="coach-hook">${esc(post.hook)}</p><div class="coach-article-meta"><span>By ${esc(post.author)} · ${date(post.createdAt)}${post.revision?` · Updated ${date(post.updatedAt)}`:''}</span>${heart(post)}</div></header><img class="coach-article-cover" src="${esc(post.coverUrl)}" alt="Cover for ${esc(post.title)}" width="1200" height="675"><div class="coach-body">${esc(post.body)}</div></article><div class="coach-author-tools">${post.canEdit?`<a href="${pathFor(id)}/edit" data-link class="coach-button coach-primary">Edit my guide</a>${button('Remove my guide','delete')}`:''}${post.canModerate?button(post.status==='hidden'?'Restore guide':'Hide guide',post.status==='hidden'?'restore':'hide'):''}</div>${user?'':'<p class="coach-signin-note">Sign in with Discord to leave a heart.</p>'}`;
      bindHearts();
      content.querySelectorAll('[data-coach-action]').forEach(el=>el.onclick=async()=>{
        const action=el.dataset.coachAction;if(!confirm(action==='delete'?'Remove this guide from the coaching room?':action==='hide'?'Hide this guide from the public coaching room?':'Restore this guide to the coaching room?'))return;
        el.disabled=true;const data=new FormData();data.set('action',action);data.set('revision',post.revision);
        try{await api(`/api/coaching/${id}`,{method:'POST',body:data});if(action==='delete')location.assign('/coaching');else await showGuide(id);report(action==='hide'?'Guide hidden.':action==='restore'?'Guide restored.':'Guide removed.');}
        catch(error){report(error.message,true);el.disabled=false;}
      });
    }
    async function editor(id){
      if(!user){content.innerHTML=`<div class="coach-empty"><h2>Your voice belongs in the playbook.</h2><p>Sign in with Discord to create and edit your own coaching guides.</p>${signin()}</div>`;return;}
      const post=id?(await api(`/api/coaching/${id}`)).post:null;if(!root.isConnected)return;
      if(post&&!post.canEdit)throw new Error('Only the author can edit this guide.');
      content.innerHTML=`<a href="${post?pathFor(id):'/coaching'}" data-link class="coach-back">← ${post?'Back to guide':'All guides'}</a><div class="coach-editor-intro"><span class="section-kicker">Your voice. Your playbook.</span><h2>${post?'Edit your guide':'Write a coaching guide'}</h2><p>Keep it helpful, keep it yours, keep it Unc. Your name appears on your post.</p>${post?.status==='hidden'?'<p class="coach-error">This guide is hidden by staff. Editing will not make it public again.</p>':''}</div><div class="coach-editor-layout"><form id="coach-form" class="coach-form"><label for="coach-title">Title <small>Up to 120 characters</small></label><input id="coach-title" name="title" required maxlength="120" value="${esc(post?.title)}" placeholder="Give your guide a clear title"><label for="coach-hook">The hook <small>A short reason to read · up to 220 characters</small></label><textarea id="coach-hook" name="hook" required maxlength="220" rows="3" placeholder="What will a teammate take away from this?">${esc(post?.hook)}</textarea><label for="coach-cover">Cover image <small>JPEG, PNG or WebP · up to 5 MB · use an image you have permission to share</small></label><input id="coach-cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" ${post?'':'required'}><label for="coach-body">Your guide <small>Plain text · paragraphs and line breaks are kept · up to 30,000 characters</small></label><textarea id="coach-body" name="body" required maxlength="30000" rows="18" placeholder="Share what you know. Explain the steps, the reasoning, and when to put it into practice.">${esc(post?.body)}</textarea><p class="coach-editor-note">${post?'Saving updates this guide immediately.':'Publishing makes your guide and cover image visible to everyone.'} Hearts belong to the guide and stay when you edit it. Owners and admins can hide posts that break community rules.</p><div class="coach-form-actions"><button type="submit" class="coach-button coach-primary">${post?'Save changes':'Publish guide'}</button>${button('Cancel','cancel')}</div><p id="coach-form-error" role="alert"></p></form><aside class="coach-editor-preview"><span class="coach-eyebrow">Card preview · Not published</span><article class="coach-card"><div class="coach-preview-image" id="coach-preview-image">Your cover image</div><div class="coach-card-copy"><span class="coach-eyebrow">Community guide</span><h3 id="coach-preview-title"></h3><p id="coach-preview-hook"></p></div><footer><span>By ${esc(user.displayName||user.username)}</span><span aria-hidden="true">♡</span></footer></article></aside></div>`;
      const form=content.querySelector('#coach-form'),errorBox=content.querySelector('#coach-form-error'),fileInput=form.elements.cover;
      const preview=()=>{content.querySelector('#coach-preview-title').textContent=form.elements.title.value||'Your title';content.querySelector('#coach-preview-hook').textContent=form.elements.hook.value||'Your hook will appear here.';};preview();
      function previewImage(url){const image=document.createElement('img');image.src=url;image.alt='Cover preview';const target=content.querySelector('#coach-preview-image');target.replaceChildren(image);}
      if(post)previewImage(post.coverUrl);
      form.addEventListener('input',()=>{dirty=true;preview();});
      fileInput.onchange=async()=>{
        dirty=true;errorBox.textContent='';const file=fileInput.files[0];if(!file)return;
        try{if(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP up to 5 MB.');const bitmap=await createImageBitmap(file);bitmap.close();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);previewImage(previewUrl);}
        catch(error){fileInput.value='';errorBox.textContent=error.message||'This image could not be opened.';}
      };
      content.querySelector('[data-coach-action="cancel"]').onclick=()=>{if(!dirty||confirm('Discard your unsaved changes?')){dirty=false;location.assign(post?pathFor(id):'/coaching');}};
      form.onsubmit=async event=>{
        event.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;errorBox.textContent='';
        const data=new FormData(form);if(post)data.set('revision',post.revision);
        try{const result=await api(id?`/api/coaching/${id}`:'/api/coaching',{method:'POST',body:data});dirty=false;location.assign(pathFor(result.post.id));}
        catch(error){errorBox.textContent=error.message;errorBox.tabIndex=-1;errorBox.focus();submit.disabled=false;}
      };
    }
    try{
      user=(await api('/api/auth/session')).user;
      const parts=location.pathname.replace(/\/+$/,'').split('/').filter(Boolean);
      if(parts.length===1){document.title='Coaching · UNC Futbol League';await feed();}
      else if(parts[1]==='new'&&parts.length===2)await editor();
      else if(parts.length===2)await showGuide(parts[1]);
      else if(parts.length===3&&parts[2]==='edit')await editor(parts[1]);
      else throw new Error('Guide not found.');
    }catch(error){content.innerHTML='<div class="coach-empty"><h2>The playbook is unavailable.</h2><p id="coach-load-error"></p><a href="/coaching" data-link class="coach-button">Back to Coaching</a></div>';content.querySelector('#coach-load-error').textContent=error.message;}
  };
})();
