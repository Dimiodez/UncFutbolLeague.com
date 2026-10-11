(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.soundPage = () => `<section class="sound-page" id="sound-page"><div class="sound-hero"><div><span class="sound-kicker">UFL · The clubhouse soundtrack</span><h1>SOUND</h1><p>For the warm-up. The late-night lobby.<br>The songs that take you back to kickoff.</p><span class="sound-preview">Test realm · Playlist preview</span></div><div class="sound-record" aria-hidden="true"><span>UNC<br>SOUND<br>01</span></div></div><div class="sound-section-title"><h2>ON THE ROTATION</h2><span id="sound-count">Loading selection…</span></div><div class="sound-grid" id="sound-playlists" aria-live="polite"><p>Loading playlists…</p></div><aside class="sound-notes"><strong>Your soundtrack. Your choice.</strong><br>Players connect only when clicked. YouTube uses its privacy-enhanced player; ads and restrictions may still apply. Spotify may offer previews depending on your account and browser. No autoplay, and no music-service passwords are collected here. Use the provider link if a track cannot play on this page.<br><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google privacy policy</a> · <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer">Spotify privacy policy</a></aside><div id="sound-management"></div></section>`;
  window.hydrateSound = async () => {
    const root = document.querySelector('#sound-page'); if (!root) return;
    let config;
    const list = root.querySelector('#sound-playlists');
    const renderCards = () => {
      root.querySelector('#sound-count').textContent = `${config.playlists.length} / 5 playlists`;
      list.innerHTML = config.playlists.map((p,i)=>{const label=p.provider==='youtube'?'YouTube':'Spotify';return `<article class="sound-card"><div class="sound-card-head"><span class="sound-number">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></div></div><div class="sound-player ${p.provider==='youtube'?'sound-player-video':''}"><div><span class="sound-play" aria-hidden="true">▶</span><p>Bring the clubhouse to life.</p><button type="button" data-load="${i}">Load ${label} player</button><p><small>Connects to ${label} only when clicked.</small></p></div></div><a class="sound-fallback" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Open in ${label} ↗</a></article>`;}).join('') || '<p>No playlists on the rotation yet. Check back soon.</p>';
      list.querySelectorAll('[data-load]').forEach(button=>button.addEventListener('click',()=>{
        const p = config.playlists[Number(button.dataset.load)];
        const url = new URL(p.url);
        const youtube = p.provider === 'youtube';
        const id = youtube ? url.searchParams.get('list') : url.pathname.match(/^\/playlist\/([A-Za-z0-9]{22})$/)?.[1];
        if (!id || (youtube && !/^[A-Za-z0-9_-]{10,100}$/.test(id))) return;
        const frame = document.createElement('iframe');
        frame.src = youtube ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(id)}&playsinline=1` : `https://open.spotify.com/embed/playlist/${id}?theme=0`;
        frame.title = `${p.title} — ${youtube?'YouTube':'Spotify'} playlist`; frame.allow = 'encrypted-media; fullscreen; picture-in-picture';
        frame.loading = 'lazy'; frame.referrerPolicy = 'strict-origin-when-cross-origin';
        button.closest('.sound-player').replaceChildren(frame);
      }));
    };
    try {
      const response = await fetch('/api/sound',{cache:'no-store'}); config = await response.json();
      if (!response.ok) throw new Error(config.error);
      if (!root.isConnected) return; renderCards();
    } catch(error) { if(root.isConnected){list.textContent=error.message || 'Could not load playlists.';root.querySelector('#sound-count').textContent='Unavailable';} return; }
    const manager = root.querySelector('#sound-management');
    let session;
    try { session = await (await fetch('/api/auth/session',{cache:'no-store'})).json(); } catch { return; }
    if (!root.isConnected) return;
    if (!['owner','admin'].includes(session.user?.role)) {
      manager.innerHTML = '<p class="sound-notes">Playlists are curated by the UFL owner and admins. <a href="/account" data-link>Sign in with Discord</a> to access your account.</p>'; return;
    }
    let draft = structuredClone(config.playlists);
    manager.innerHTML = '<details class="sound-manager"><summary>Manage Sound · Owner / admin</summary><p>Up to five playlists total from YouTube or Spotify. Changes apply to this test realm only.</p><div id="sound-editor"></div><div class="sound-save-row"><button type="button" id="sound-add">+ Add playlist</button><button type="button" id="sound-save">Save playlists</button></div><p class="sound-status" role="status"></p></details>';
    const editor = manager.querySelector('#sound-editor'); const status = manager.querySelector('.sound-status');
    const read = () => { draft = [...editor.querySelectorAll('.sound-editor-row')].map(row=>({title:row.querySelector('[name=title]').value,description:row.querySelector('[name=description]').value,url:row.querySelector('[name=url]').value})); };
    const draw = () => {
      editor.innerHTML = draft.map((p,i)=>`<div class="sound-editor-row"><label>Playlist ${i+1} title<input name="title" maxlength="80" required value="${esc(p.title)}"></label><label>YouTube or Spotify playlist link<input name="url" type="url" required value="${esc(p.url)}" placeholder="Paste a YouTube or Spotify playlist link"></label><label>Description<textarea name="description" maxlength="240" rows="2">${esc(p.description)}</textarea></label><div class="sound-editor-actions"><button type="button" data-move="${i}" data-direction="-1" ${i===0?'disabled':''} aria-label="Move playlist ${i+1} up">↑ Move up</button><button type="button" data-move="${i}" data-direction="1" ${i===draft.length-1?'disabled':''} aria-label="Move playlist ${i+1} down">↓ Move down</button><button type="button" data-remove="${i}">Remove</button></div></div>`).join('');
      manager.querySelector('#sound-add').disabled = draft.length >= 5;
      editor.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>{read();const i=Number(b.dataset.move),j=i+Number(b.dataset.direction);[draft[i],draft[j]]=[draft[j],draft[i]];draw();}));
      editor.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{read();draft.splice(Number(b.dataset.remove),1);draw();status.textContent='Removed from draft. Save to apply.';}));
    };
    manager.querySelector('#sound-add').addEventListener('click',()=>{read();if(draft.length<5){draft.push({title:'',description:'',url:''});draw();}});
    manager.querySelector('#sound-save').addEventListener('click',async()=>{
      read(); if([...editor.querySelectorAll('input,textarea')].some(field=>!field.reportValidity())) return;
      const buttons=[...manager.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);status.textContent='Saving…';
      try {
        const response = await fetch('/api/sound',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({revision:config.revision,playlists:draft})});
        const result=await response.json();if(!response.ok)throw new Error(result.error);
        config=result;draft=structuredClone(result.playlists);if(!root.isConnected)return;renderCards();status.textContent='Saved to the test realm.';
      } catch(error){status.textContent=error.message || 'Could not save. Try again.';}
      finally {buttons.forEach(b=>b.disabled=false);draw();}
    });
    draw();
  };
})();
