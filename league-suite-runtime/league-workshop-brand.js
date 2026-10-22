import {installWorkspaceNavigation} from './league-workspace-navigation.js';
// Preview-only site shell. Does not load the production router or change permissions.
export function installWorkshopBrand(){
 document.body.classList.add('unc-admin-preview');document.querySelector('main.workshop').classList.add('unc-workspace');
 const font=document.createElement('link');font.rel='stylesheet';font.href='https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap';
 const css=document.createElement('link');css.rel='stylesheet';css.href='/league-workshop-brand.css?v=20261022-suite-nav1';document.head.append(font,css);
 const navigationCss=document.createElement('link');navigationCss.rel='stylesheet';navigationCss.href='/league-workspace-navigation.css?v=20261022-suite-nav1';document.head.append(navigationCss);
 const header=document.createElement('header');header.className='site-header workshop-site-header';header.innerHTML='<a class="brand" href="/" aria-label="UNC Futbol League preview home"><img src="/assets/ufl-mark.webp" alt=""><span><strong>UNC</strong> FUTBOL LEAGUE<small>League Suite</small></span></a><nav class="workshop-public-links" aria-label="UNC Futbol League"><a href="/">Home</a><a href="/ufb">UFB docs</a><a href="/utility">Utility</a><a href="/fun">Fun</a><a href="/league">League</a></nav><nav class="workshop-site-links" aria-label="Account and administration"><a href="/league-workshop" aria-current="page">Suite</a><a href="/admin">Admin</a><a href="/account">Account</a></nav><label class="workshop-theme-label">Theme<select aria-label="Site theme"><option value="dark">Dark</option><option value="classic">Classic</option><option value="vintage">Vintage</option></select></label>';
 const skip=document.createElement('a');skip.className='skip-link';skip.href='#workshop-main';skip.textContent='Skip to league administration';document.querySelector('main.workshop').id='workshop-main';document.body.prepend(skip,header);
 const select=header.querySelector('select');let saved;try{saved=localStorage.getItem('ufl-theme');}catch{}const theme=['classic','dark','vintage'].includes(saved)?saved:'dark';
 const setTheme=value=>{document.documentElement.dataset.theme=value;select.value=value;};setTheme(theme);select.onchange=()=>{setTheme(select.value);try{localStorage.setItem('ufl-theme',select.value);}catch{}};
 const intro=document.querySelector('.workshop>header');intro.querySelector('a').textContent='UNC FUTBOL LEAGUE HOME';intro.querySelector('a').href='/';
 const actions=document.createElement('nav');actions.className='suite-hero-actions';actions.setAttribute('aria-label','League Suite shortcuts');actions.innerHTML='<a href="/">← Home</a><a href="/league">Public league</a><a href="/ufb">UFB documentation</a>';intro.append(actions);
 const chip=intro.querySelector('.season-chip');if(chip)chip.textContent='Development preview';
 installWorkspaceNavigation();
 const notice=document.querySelector('.preview-notice');if(notice)notice.innerHTML='Development preview · Local league drafts · No changes to the live website or bot';
}
