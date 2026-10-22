import {installWorkspaceNavigation} from './league-workspace-navigation.js';
// The full public-site header is present in the HTML before the workspace starts.
// Keep presentation inside the suite; never replace the site's navigation.
export function installWorkshopBrand(){
 const main=document.querySelector('main.workshop');if(!main)return;
 document.body.classList.add('unc-admin-preview');main.classList.add('unc-workspace');
 main.id='workshop-main';
 const intro=main.querySelector(':scope>header'),back=intro?.querySelector('a');
 if(back){back.textContent='UFL · League';back.href='/league';}
 const chip=intro?.querySelector('.season-chip');if(chip)chip.textContent='Private beta';
 installWorkspaceNavigation(main);
 const group=document.querySelector('[data-nav-hub="league"]');group?.classList.add('active');
 group?.querySelector('.nav-group-link')?.classList.add('active');
 hydrateSiteHeader();
 const notice=document.querySelector('.preview-notice');if(notice)notice.textContent='Private League Suite · Test data only · Public league unchanged';
}
async function hydrateSiteHeader(){
 try{
  const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)return;const state=await response.json(),account=document.querySelector('#account-nav');
  if(account)account.textContent=state.authenticated?state.user.displayName:'Sign in';
  const staff=state.authenticated&&['owner','admin'].includes(state.user?.role);
  if(staff&&account&&!document.querySelector('#admin-nav')){const admin=document.createElement('a');admin.href='/admin';admin.id='admin-nav';admin.textContent='Admin';account.before(admin);}
  const accessResponse=await fetch('/api/league-suite/access',{cache:'no-store'});
  if(!accessResponse.ok)return;const access=await accessResponse.json(),menu=document.querySelector('[data-nav-hub="league"] .nav-menu');
  if(access.allowed&&menu){const link=document.createElement('a');link.href='/league-suite';link.dataset.leagueSuiteLink='';link.innerHTML='<b>League Suite</b><small>Private league management & EA testing</small>';if(!location.pathname.includes('ea-clubs')&&!location.pathname.includes('dashboard')&&!location.pathname.includes('join'))link.setAttribute('aria-current','page');menu.append(link);}
 }catch{/* Header navigation remains available if account status cannot be loaded. */}
}

