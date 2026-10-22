/* Shared navigation and safe, same-tab login handoff. No permissions or auth tokens. */
(() => {
 const routeKey=url=>url.pathname+'|'+(url.searchParams.get('season')||'2')+'|'+(url.searchParams.get('division')||url.searchParams.get('type')||'');
 const safeReturn=value=>{
  if(typeof value!=='string'||value.length>600||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return null;
  try{const u=new URL(value,'https://www.uncfutbolleague.com');if(u.origin!=='https://www.uncfutbolleague.com'||!['/team-hub','/pickems','/coaching','/arcade','/league-suite','/league-suite/ea-clubs','/league-suite/dashboard','/league-suite/join'].includes(u.pathname))return null;return u.pathname+u.search;}catch{return null;}
 };
 let pending=null;
 function rememberReturn(value){const path=safeReturn(value);if(!path)return false;try{sessionStorage.setItem('ufl-login-return',JSON.stringify({path,at:Date.now()}));return true;}catch{return false;}}
 function completeLoginReturn(state){
  if(!state?.authenticated||location.pathname!=='/account')return false;
  const requested=safeReturn(new URLSearchParams(location.search).get('returnTo'));
  let saved;try{saved=JSON.parse(sessionStorage.getItem('ufl-login-return')||'null');}catch{}
  const path=requested||(new URLSearchParams(location.search).get('login')==='success'&&saved&&Date.now()-saved.at>=0&&Date.now()-saved.at<1800000?safeReturn(saved.path):null);
  if(!path)return false;try{sessionStorage.removeItem('ufl-login-return');}catch{}location.replace(path);return true;
 }
 function closeMenus(focus=false){
  const menu=document.querySelector('.menu-button'),nav=document.querySelector('.main-nav'),opened=nav?.classList.contains('open');
  nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false');
  syncOverlay();
  document.querySelectorAll('.nav-group.open').forEach(group=>{group.classList.remove('open');group.querySelector(':scope > button')?.setAttribute('aria-expanded','false');});
  if(focus&&opened)menu?.focus();
 }
 function saveScroll(){try{history.replaceState({...history.state,uflScroll:{left:scrollX,top:scrollY}},'',location.href);}catch{}}
 function afterRender(main){
  enhancePage(main);
  if(location.pathname==='/account')rememberReturn(new URLSearchParams(location.search).get('returnTo'));
  if(!pending)return;
  const intent=pending;pending=null;
  if(intent.restore){scrollTo({...intent.restore,behavior:'instant'});return;}
  if(intent.hash){try{document.getElementById(decodeURIComponent(intent.hash.slice(1)))?.scrollIntoView({behavior:'instant'});}catch{}return;}
  if(intent.newPage){scrollTo({left:0,top:0,behavior:'instant'});const h=main.querySelector('h1')||main;h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}
 }
 function enhancePage(main){
  const path=location.pathname,home=path==='/',heading=main.querySelector('h1')||main.querySelector('h2');
  document.body.classList.toggle('interior-route',!home);
  const toolTitles={'/func':'FUNC Card Studio','/wheel':'Unc Wheel','/pickems':'Pick’ems','/arcade/cleat':'Cleat Arcade','/arcade/loosey-goosey':'Loosey Goosey','/arcade/sandy-uppy':'Sandy Uppy','/arcade/mountain-mayhem':'Mountain Mayhem'};
  if(!home&&heading)document.title=heading.textContent.trim()+' · UNC Futbol League';else if(home)document.title='UNC Futbol League';
  if(toolTitles[path])document.title=toolTitles[path]+' · UNC Futbol League';
  let bar=main.querySelector(':scope > .page-context');
  if(!bar){bar=document.createElement('nav');bar.className='page-context';bar.setAttribute('aria-label','Page context');main.prepend(bar);}
  bar.replaceChildren();
  if(!home){const parent=path.startsWith('/arcade/')?['/arcade','← Back to Arcade']:path.startsWith('/teams/house/')?['/teams?division=house','← All house teams']:path.startsWith('/league-suite')?['/league','← League hub']:path.startsWith('/wheel')?['/utility','← Utility hub']:['/','← Home'];const link=document.createElement('a');link.href=parent[0];link.textContent=parent[1];if(document.body.dataset.standaloneNavigation!=='true')link.setAttribute('data-link','');bar.append(link);}
  window.UFLTime?.control(bar);
  if(home)main.querySelector('#home-calendar')?.prepend(bar);
  if(path==='/ufb'||path.startsWith('/coaching/'))installGuideNavigation(main);
  if(path==='/ufb'){
   const intro=main.querySelector('.ufb-reference > .card');
   if(intro&&!intro.querySelector('details')){const notes=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Guide scope & integration notes';notes.append(summary);[...intro.querySelectorAll(':scope > p')].slice(1).forEach(p=>notes.append(p));intro.append(notes);}
  }
  main.querySelectorAll('.league-explorer > .sync-note').forEach(note=>{if(!/^(Provisional|Public collaborator)/.test(note.textContent))return;const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Roster source & verification';note.before(details);details.append(summary,note);});
  if(/^\/(clubs|players)\//.test(path)&&heading)main.querySelectorAll('h2').forEach(h=>{if(h.textContent.trim()===heading.textContent.trim())h.classList.add('sr-only');});
 }
 function installGuideNavigation(main){
  if(main.querySelector('[data-guide-navigation]'))return;
  const headings=[...main.querySelectorAll('h2,h3,.ufb-category > summary')].filter(h=>h.textContent.trim());if(headings.length<3)return;
  const panel=document.createElement('details');panel.dataset.guideNavigation='';panel.className='guide-navigation';
  const summary=document.createElement('summary');summary.textContent='Jump to a guide section';panel.append(summary);
  const search=document.createElement('input');search.type='search';search.placeholder='Find a section';search.setAttribute('aria-label','Find a guide section');panel.append(search);
  const list=document.createElement('nav');list.setAttribute('aria-label','Guide sections');headings.forEach((h,index)=>{if(!h.id)h.id='guide-section-'+index;const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;a.onclick=()=>{const section=h.closest('details');if(section)section.open=true;};list.append(a);});panel.append(list);
  search.oninput=()=>list.querySelectorAll('a').forEach(a=>a.hidden=!a.textContent.toLowerCase().includes(search.value.toLowerCase()));
  (main.querySelector('.page-context')||main.firstElementChild).after(panel);
 }
 function session(state){const note=document.querySelector('.arcade-signup-note');if(note&&state.authenticated){note.replaceChildren();const strong=document.createElement('strong');strong.textContent='Signed in as '+state.user.displayName;note.append(strong,' · Your eligible personal bests can appear on the leaderboard.');}}
 window.UFLUX={safeReturn,rememberReturn,completeLoginReturn,closeMenus,afterRender,enhancePage,installGuideNavigation,session};
 if(typeof document==='undefined')return;
 if('scrollRestoration'in history)history.scrollRestoration='manual';
 document.addEventListener('click',event=>{
  const link=event.target.closest('a');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target||link.hasAttribute('download'))return;
  const next=new URL(link.href,location.href);if(next.origin!==location.origin)return;
  if(next.pathname==='/account')rememberReturn(next.searchParams.get('returnTo'));
  if(!link.hasAttribute('data-link'))return;
  saveScroll();pending={newPage:routeKey(next)!==routeKey(new URL(location.href)),hash:next.hash};
  closeMenus();
 },true);
 window.addEventListener('popstate',event=>{pending={restore:event.state?.uflScroll||{left:0,top:0}};});
 function overlayOpen(){return document.querySelector('.main-nav.open')&&getComputedStyle(document.querySelector('.menu-button')).display!=='none';}
 const obscured=new Map();
 function syncOverlay(){
  if(overlayOpen()){
   document.querySelectorAll('body > main, body > footer, body > aside, #main, .site-footer').forEach(el=>{if(!obscured.has(el)){obscured.set(el,el.inert);el.inert=true;}});
  }else{for(const [el,inert] of obscured)el.inert=inert;obscured.clear();}
 }
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closeMenus(true);return;}
  if(event.key!=='Tab'||!overlayOpen())return;
  const items=[...document.querySelectorAll('.site-header a[href], .site-header button:not([disabled]), .site-header select')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));
  const first=items[0],last=items.at(-1);if(!first)return;
  if(event.shiftKey&&(document.activeElement===first||!document.activeElement.closest('.site-header'))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!document.activeElement.closest('.site-header'))){event.preventDefault();first.focus();}
 });
 window.addEventListener('resize',syncOverlay);
 document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenus();});
 function init(){
  const watchedNav=document.querySelector('.main-nav');
  if(watchedNav)new MutationObserver(syncOverlay).observe(watchedNav,{attributes:true,attributeFilter:['class']});
  if(location.pathname==='/account')rememberReturn(new URLSearchParams(location.search).get('returnTo'));
  if(document.body.dataset.standaloneNavigation!=='true')return;
  const standaloneMain=document.querySelector('main');if(standaloneMain)enhancePage(standaloneMain);
  const menu=document.querySelector('.menu-button'),nav=document.querySelector('.main-nav');
  menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
  document.querySelectorAll('.nav-group-caret').forEach(button=>button.addEventListener('click',()=>{
   const group=button.closest('.nav-group'),open=!group.classList.contains('open');
   document.querySelectorAll('.nav-group.open').forEach(other=>{other.classList.remove('open');other.querySelector(':scope > button')?.setAttribute('aria-expanded','false');});
   group.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));
  }));
  document.querySelectorAll('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>{
   document.documentElement.dataset.theme=button.dataset.themeChoice;try{localStorage.setItem('ufl-theme',button.dataset.themeChoice);}catch{}
   document.querySelectorAll('[data-theme-choice]').forEach(b=>{b.setAttribute('aria-pressed',String(b===button));b.classList.toggle('active',b===button);});
  }));
  document.querySelectorAll('[data-theme-choice]').forEach(button=>{const selected=button.dataset.themeChoice===document.documentElement.dataset.theme;button.setAttribute('aria-pressed',String(selected));button.classList.toggle('active',selected);});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

