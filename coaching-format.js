(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function inline(text){
    const pattern=/\[([^\]\n]{1,160})\]\((https:\/\/[^\s<>)]{1,1000})\)/g;let html='',last=0;
    for(const match of text.matchAll(pattern)){
      html+=esc(text.slice(last,match.index));let url;try{url=new URL(match[2]);}catch{}
      html+=url&&url.protocol==='https:'&&!url.username&&!url.password?`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(match[1])}</a>`:esc(match[0]);last=match.index+match[0].length;
    }
    return html+esc(text.slice(last));
  }
  window.coachingRenderBody=(body,images=[])=>{
    const used=new Set();let html='',paragraph=[],list=false;
    const flush=()=>{if(paragraph.length){html+=`<p>${paragraph.map(inline).join('<br>')}</p>`;paragraph=[];}if(list){html+='</ul>';list=false;}};
    const figure=image=>`<figure class="coach-inline-image"><img src="${esc(image.url)}" alt="${esc(image.caption||'Guide illustration')}" loading="lazy"><figcaption>${esc(image.caption)}</figcaption></figure>`;
    for(const line of String(body).split(/\r?\n/)){
      const marker=line.trim().match(/^\[\[image:([a-f0-9-]{36})\]\]$/),image=marker&&images.find(image=>image.id===marker[1]);
      if(image){flush();html+=figure(image);used.add(image.id);continue;}
      const heading=line.match(/^(#{2,3})\s+(.+)$/);
      if(heading){flush();const level=heading[1].length+1;html+=`<h${level}>${inline(heading[2])}</h${level}>`;continue;}
      if(line.startsWith('- ')){if(paragraph.length){html+=`<p>${paragraph.map(inline).join('<br>')}</p>`;paragraph=[];}if(!list){html+='<ul>';list=true;}html+=`<li>${inline(line.slice(2))}</li>`;continue;}
      if(!line.trim()){flush();continue;}
      if(list){html+='</ul>';list=false;}paragraph.push(line);
    }
    flush();return html+images.filter(image=>!used.has(image.id)).map(figure).join('');
  };
})();
