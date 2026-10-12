// Public pages expose only navigation, never playbooks or account assignments.
function installTeamHubEntry(){
 const main=document.querySelector('#main');if(!main)return;
 const club=location.pathname.match(/^\/clubs\/([^/]+)$/),params=new URLSearchParams(location.search);
 if(club&&params.get('season')!=='1'&&!main.querySelector('[data-private-hub-link]')){
  const profile=main.querySelector('.league-club-profile');if(profile){const section=document.createElement('section');section.dataset.privateHubLink='';section.className='card';const division=params.get('division')==='10v10'?'10v10':'6v6',link=document.createElement('a');link.className='button button-secondary';link.href='/team-hub?team='+encodeURIComponent(division+':'+decodeURIComponent(club[1]));link.textContent='Private team hub · sign-in required';section.append(link);profile.after(section);}
 }
 const admin=main.querySelector('#admin-root');if(admin&&!admin.querySelector('[data-hub-access-link]')&&admin.querySelector('.member-row')){const a=document.createElement('a');a.dataset.hubAccessLink='';a.className='button button-primary';a.href='/team-hub-access';a.textContent='Team hubs · assign managers & player accounts';admin.prepend(a);}
 const account=main.querySelector('.account-profile');if(account&&!main.querySelector('[data-my-hubs]')){const a=document.createElement('a');a.dataset.myHubs='';a.className='button button-secondary';a.href='/team-hub';a.textContent='My private team hubs';account.after(a);}
}
new MutationObserver(installTeamHubEntry).observe(document.querySelector('#main')||document.body,{childList:true,subtree:true});installTeamHubEntry();
