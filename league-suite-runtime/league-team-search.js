const API='/api/league-suite/ea';
export async function eaClubRequest(path,payload,{fetcher=fetch}={}){
 const response=await fetcher(API+path,{cache:'no-store',signal:AbortSignal.timeout(25000),...(payload?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}:{})});
 let data;try{data=await response.json();}catch{throw Error('EA lookup could not be loaded. Check your sign-in and try again.');}
 if(!response.ok)throw Error(data.error||'EA club lookup failed. Try again.');
 return data;
}
// No automatic name match: only the explicit Link button selects a club.
export function mountTeamClubSearch({host,name='',linkedId='',onLink,request=eaClubRequest}){
 const area=document.createElement('fieldset');area.className='ea-team-search';
 const legend=document.createElement('legend');legend.textContent='Find the EA club';
 const label=document.createElement('label');label.textContent='In-game club name';
 const input=document.createElement('input');input.type='search';input.minLength=2;input.maxLength=80;input.autocomplete='off';input.value=typeof name==='function'?name():name;
 label.append(input);
 const search=document.createElement('button');search.type='button';search.textContent='Search EA';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const results=document.createElement('div');results.className='ea-team-search-results';
 area.append(legend,label,search,status,results);host.append(area);
 let generation=0,busy=false;
 const disableLinks=value=>results.querySelectorAll('button').forEach(button=>button.disabled=value);
 input.addEventListener('input',()=>{generation++;results.replaceChildren();status.textContent='';});
 const run=async()=>{
  if(busy)return;
  if(!input.value.trim()&&typeof name==='function')input.value=name();
  const query=input.value.trim();
  if(query.length<2){status.textContent='Enter at least 2 characters of the in-game club name.';input.focus();return;}
  const token=++generation;results.replaceChildren();status.textContent='Searching EA…';search.disabled=true;
  try{
   const data=await request('/search?name='+encodeURIComponent(query));
   if(token!==generation||!area.isConnected)return;
   if(!Array.isArray(data.clubs))throw Error('EA returned an invalid club list. Try again.');
   status.textContent=data.clubs.length?'Check the name and club ID, then choose Link.':'No teams found. Try the exact in-game club name.';
   for(const club of data.clubs){
    const row=document.createElement('article'),identity=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('small'),link=document.createElement('button');
    title.textContent=club.name;detail.textContent=`EA club ${club.id} · Current generation`;identity.append(title,detail);link.type='button';link.textContent=club.id===linkedId?'Linked':'Link';link.disabled=club.id===linkedId;link.setAttribute('aria-label',`Link ${club.name}, EA club ${club.id}`);
    link.onclick=async()=>{
     if(busy)return;busy=true;search.disabled=true;input.disabled=true;disableLinks(true);link.textContent='Linking…';status.textContent='Verifying the selected EA club…';
     try{const message=await onLink(club);linkedId=club.id;status.textContent=message||'Club linked.';results.querySelectorAll('button').forEach(button=>button.textContent='Link');link.textContent='Linked';}
     catch(error){status.textContent=error.message;link.textContent='Link';}
     finally{busy=false;search.disabled=false;input.disabled=false;results.querySelectorAll('button').forEach(button=>button.disabled=button.textContent==='Linked');}
    };
    row.append(identity,link);results.append(row);
   }
  }catch(error){if(token===generation)status.textContent=error.message;}
  finally{if(token===generation||!busy)search.disabled=false;}
 };
 search.onclick=run;input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();run();}});
 return area;
}

export function renderTeamClubLinks({host,draft,onLink}){
 const section=document.createElement('section');section.className='card ea-team-links';
 const title=document.createElement('h3'),help=document.createElement('p');title.textContent='Link teams to EA clubs';help.textContent='Search by the in-game name, check the matching club, then choose Link. Shared league links save online; new drafts stay on this device until saved online. Linking does not grant manager access or publish results.';section.append(title,help);
 if(!draft.settings.teams.length){const empty=document.createElement('p');empty.textContent='Register a team above to link its EA club.';section.append(empty);}
 for(const team of draft.settings.teams){
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`${team.name} · ${team.eaClubId?'EA '+team.eaClubId+(team.eaClubLink?.id===team.eaClubId?' · Linked':' · Not verified'):'Not linked'}`;details.append(summary);
  mountTeamClubSearch({host:details,name:team.eaClubLink?.name||team.name,onLink:async club=>onLink(team.id,club)});section.append(details);
 }
 host.append(section);
}
