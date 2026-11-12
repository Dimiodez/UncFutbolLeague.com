import {mountTeamClubSearch} from './league-team-search.js?v=20261112-link1';
export function installInternationalTeamSetup(host){
 const section=document.createElement('details');section.className='card ea-team-links';section.dataset.internationalSetup='';
 const summary=document.createElement('summary');summary.textContent='Internationals · Team links & migration setup';
 const help=document.createElement('p');help.textContent='Prepare the existing international competition here. Search each national team’s in-game club name and choose Link. This saves EA club IDs online; it does not start migration or replace current results.';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const list=document.createElement('div');section.append(summary,help,status,list);host.append(section);
 let loaded=false,loading=false;
 const request=async payload=>{
  const response=await fetch('/api/league-suite/international-setup',{cache:'no-store',signal:AbortSignal.timeout(25000),...(payload?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}:{})});
  let data;try{data=await response.json();}catch{throw Error('International setup could not load. Check your sign-in and reload.');}
  if(!response.ok)throw Error(data.error||'International setup could not be saved.');return data;
 };
 async function load(){
  if(loading)return;loading=true;status.textContent='Loading national team links…';
  try{const data=await request();list.replaceChildren();
   const count=data.linkedTeams,total=data.teams.length;status.textContent=`${count}/${total} national teams linked · Results source: ${data.competition.trackingSource==='league-suite'?'League Suite':'Virtual Arena (migration not activated)'}.`;
   for(const team of data.teams){const details=document.createElement('details'),title=document.createElement('summary');title.textContent=`${team.name} · ${team.eaClubId?'EA '+team.eaClubId:'Not linked'}`;details.append(title);
    mountTeamClubSearch({host:details,name:team.name,onLink:async club=>{const result=await request({teamId:team.id,expectedClubId:team.eaClubId,club});await loadAfterLink();return result.note;}});list.append(details);}
   loaded=true;
  }catch(error){status.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='Retry loading';retry.onclick=()=>{retry.remove();load();};status.append(retry);}
  finally{loading=false;}
 }
 async function loadAfterLink(){loaded=false;await load();}
 section.addEventListener('toggle',()=>{if(section.open&&!loaded)load();});
 return section;
}
