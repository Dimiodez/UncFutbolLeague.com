// One navigation set across the four workspace destinations; no production data changes.
const destinations=[['/league-workshop','League administration'],['/ea-clubs','EA club lookup'],['/players?season=2&division=6v6&workspace=1','Player directory'],['/league-dashboard','My dashboard']];
export function installWorkspaceNavigation(main=document.querySelector('main.workshop')){
 const path=location.pathname.replace(/\.html$/,'');
 let nav=main.querySelector('.workshop-nav');
 if(!nav){nav=document.createElement('nav');main.querySelector('header')?.after(nav);}
 nav.className='workshop-nav';nav.setAttribute('aria-label','League workspace');nav.replaceChildren();
 for(const [href,label] of destinations){const link=document.createElement('a');link.href=href;link.textContent=label;if(path===href.split('?')[0])link.setAttribute('aria-current','page');nav.append(link);}
 if(path!=='/league-workshop'&&!main.querySelector('[data-workspace-back]')){const back=document.createElement('a');back.href='/league-workshop';back.dataset.workspaceBack='';back.className='workspace-back';back.textContent='Back to League Workspace';nav.before(back);}
}

// The existing player directory uses the public site router. Retain that router,
// portraits and links; add a workspace return bar only when opened from here.
if(new URLSearchParams(location.search).get('workspace')==='1'&&location.pathname.startsWith('/players')){
 const main=document.querySelector('#main');
 if(main){const bar=document.createElement('section');bar.className='workspace-directory-navigation';const header=document.createElement('header');bar.append(header);main.before(bar);installWorkspaceNavigation(bar);const css=document.createElement('link');css.rel='stylesheet';css.href='/league-workspace-navigation.css';document.head.append(css);}
}
