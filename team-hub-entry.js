// Public pages expose only navigation, never playbooks or account assignments.
function installTeamHubEntry(){
 const main=document.querySelector('#main');if(!main)return;
 const club=location.pathname.match(/^\/clubs\/([^/]+)$/),params=new URLSearchParams(location.search);
 if(club&&params.get('season')!=='1'&&!main.querySelector('[data-private-hub-link]')){
  const profile=main.querySelector('.league-club-profile');if(profile){const section=document.createElement('section');section.dataset.privateHubLink='';section.className='league-team-hub-entry';const division=params.get('division')==='10v10'?'10v10':'6v6',link=document.createElement('a');link.className='button button-primary';link.href='/team-hub?team='+encodeURIComponent(division+':'+decodeURIComponent(club[1]));link.textContent='Open Team Hub →';const note=document.createElement('small');note.textContent='Private tactics & team playbooks · Team access required';section.append(link,note);const heading=profile.querySelector('h2');if(heading)heading.after(section);else profile.querySelector('div')?.prepend(section);}
 }
 const admin=main.querySelector('#admin-root');if(admin&&!admin.querySelector('[data-hub-access-link]')&&admin.querySelector('.member-row')){const a=document.createElement('a');a.dataset.hubAccessLink='';a.className='button button-primary';a.href='/team-hub-access';a.textContent='Team hubs · assign managers & player accounts';admin.prepend(a);}
 const account=main.querySelector('.account-profile');if(account&&!main.querySelector('[data-my-hubs]')){const a=document.createElement('a');a.dataset.myHubs='';a.className='button button-secondary';a.href='/team-hub';a.textContent='My private team hubs';account.after(a);}
}
function startTeamHubEntry(){const host=document.querySelector('#main')||document.body;if(!host)return;new MutationObserver(installTeamHubEntry).observe(host,{childList:true,subtree:true});installTeamHubEntry();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startTeamHubEntry,{once:true});else startTeamHubEntry();
