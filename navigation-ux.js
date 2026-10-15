/* Shared navigation and safe, same-tab login handoff. No permissions or auth tokens. */
(() => {
 const routeKey=url=>url.pathname+'|'+(url.searchParams.get('season')||'2')+'|'+(url.searchParams.get('division')||url.searchParams.get('type')||'');
 const safeReturn=value=>{
  if(typeof value!=='string'||value.length>600||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return null;
  try{const u=new URL(value,'https://www.uncfutbolleague.com');if(u.origin!=='https://www.uncfutbolleague.com'||!['/team-hub','/pickems','/coaching','/arcade'].includes(u.pathname))return null;return u.pathname+u.search;}catch{return null;}
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
  document.querySelectorAll('.nav-group.open').forEach(group=>{group.classList.remove('open');group.querySelector(':scope > button')?.setAttribute('aria-expanded','false');});
  if(focus&&opened)menu?.focus();
 }
 function saveScroll(){try{history.replaceState({...history.state,uflScroll:{left:scrollX,top:scrollY}},'',location.href);}catch{}}
 function afterRender(main){
  if(location.pathname==='/account')rememberReturn(new URLSearchParams(location.search).get('returnTo'));
  if(!pending)return;
  const intent=pending;pending=null;
  if(intent.restore){scrollTo({...intent.restore,behavior:'instant'});return;}
  if(intent.hash){try{document.getElementById(decodeURIComponent(intent.hash.slice(1)))?.scrollIntoView({behavior:'instant'});}catch{}return;}
  if(intent.newPage){scrollTo({left:0,top:0,behavior:'instant'});const h=main.querySelector('h1')||main;h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}
 }
 window.UFLUX={safeReturn,rememberReturn,completeLoginReturn,closeMenus,afterRender};
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
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenus(true);}});
 document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenus();});
 function init(){
  if(location.pathname==='/account')rememberReturn(new URLSearchParams(location.search).get('returnTo'));
  if(document.body.dataset.standaloneNavigation!=='true')return;
  const menu=document.querySelector('.menu-button'),nav=document.querySelector('.main-nav');
  menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
  document.querySelectorAll('.nav-group-caret').forEach(button=>button.addEventListener('click',()=>{
   const group=button.closest('.nav-group'),open=!group.classList.contains('open');
   document.querySelectorAll('.nav-group.open').forEach(other=>{other.classList.remove('open');other.querySelector(':scope > button')?.setAttribute('aria-expanded','false');});
   group.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));
  }));
  document.querySelectorAll('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>{
   document.documentElement.dataset.theme=button.dataset.themeChoice;try{localStorage.setItem('ufl-theme',button.dataset.themeChoice);}catch{}
   document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  }));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
