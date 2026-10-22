// One navigation set across the workspace destinations; no production data changes.
const destinations=[['/league-suite','Suite overview'],['/league-suite/ea-clubs','EA club lookup'],['/players?season=2&division=6v6&workspace=1','Player directory'],['/league-suite/dashboard','Test registrations'],['/team-hub','Team hubs']];
function workspacePath(){
 const path=location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
 if(path==='/league-suite-assets/league-workshop')return '/league-suite';
 if(path==='/league-suite-assets/ea-clubs')return '/league-suite/ea-clubs';
 if(path==='/league-suite-assets/league-dashboard')return '/league-suite/dashboard';
 return path;
}
export function installWorkspaceNavigation(main=document.querySelector('main.workshop')){
 const path=workspacePath();
 let nav=main.querySelector('.workshop-nav');
 if(!nav){nav=document.createElement('nav');main.querySelector('header')?.after(nav);}
 nav.className='workshop-nav';nav.setAttribute('aria-label','League Suite');nav.replaceChildren();
 for(const [href,label] of destinations){const link=document.createElement('a');link.href=href;link.textContent=label;if(path===href.split('?')[0])link.setAttribute('aria-current','page');nav.append(link);}
 const existingBack=main.querySelector('[data-workspace-back]');
 if(path==='/league-suite')existingBack?.remove();
 else if(!existingBack){const back=document.createElement('a');back.href='/league-suite';back.dataset.workspaceBack='';back.className='workspace-back';back.textContent='← League Suite overview';nav.before(back);}
}

// The existing player directory uses the public site router. Retain that router,
// portraits and links; add a workspace return bar only when opened from here.
if(new URLSearchParams(location.search).get('workspace')==='1'&&location.pathname.startsWith('/players')){
 const main=document.querySelector('#main');
 if(main){const bar=document.createElement('section');bar.className='workspace-directory-navigation';const header=document.createElement('header');bar.append(header);main.before(bar);installWorkspaceNavigation(bar);const css=document.createElement('link');css.rel='stylesheet';css.href='/league-suite-assets/league-workspace-navigation.css';document.head.append(css);}
}
