import {mountTeamClubSearch} from './league-team-search.js?v=20261112-link1';
export function installInternationalTeamSetup(host){
 const section=document.createElement('details');section.className='card ea-team-links';section.dataset.internationalSetup='';
 const summary=document.createElement('summary');summary.textContent='Internationals · Team links & migration setup';
 const help=document.createElement('p');help.textContent='Prepare the existing international competition here. Search each national team’s in-game club name and choose Link. This saves EA club IDs online; it does not start migration or replace current results.';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const tracker=document.createElement('section');tracker.className='card';
 const list=document.createElement('div');section.append(summary,help,status,tracker,list);host.append(section);
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
   await loadTracker();
  }catch(error){status.textContent=error.message;const retry=document.createElement('button');retry.type='button';retry.textContent='Retry loading';retry.onclick=()=>{retry.remove();load();};status.append(retry);}
  finally{loading=false;}
 }
 async function loadAfterLink(){loaded=false;await load();}
 async function loadTracker(){
  tracker.replaceChildren();const heading=document.createElement('h3');heading.textContent='Automatic international test tracker';tracker.append(heading);
  const note=document.createElement('p');note.textContent='Automatic EA collection updates the saved standings and player totals. Import verified VA history once to continue the season from its existing totals. Public result-source settings remain unchanged.';tracker.append(note);
  try{
   const r=await fetch('/api/league-suite/international-tracker',{cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error);
   const health=document.createElement('p');health.setAttribute('role','status');health.textContent=`${data.prepared?(data.enabled?'Enabled · Worker checks every 5 minutes':'Prepared · Stopped'):'Not prepared'} · Worker build: ${data.workerReady?'international-ready':'deployment required'} · ${data.accepted} accepted · ${data.pending} awaiting review · Last worker check: ${data.checkedAt||'not yet recorded'}`;tracker.append(health);
   if(data.health?.error||data.health?.warnings?.length){const warning=document.createElement('p');warning.textContent=data.health.error||data.health.warnings.join(' ');tracker.append(warning);}
   if(data.baseline){const baseline=document.createElement('p');baseline.textContent=`VA baseline imported · ${data.baseline.matches} historical matches · New matches continue from EA.${data.tonight?' November 12 kickoff: 9:00 / 9:30 PM Central.':''}`;tracker.append(baseline);}
   else if(data.prepared){
    const preview=document.createElement('button');preview.type='button';preview.textContent='Preview existing VA results & stats';tracker.append(preview);
    preview.onclick=async()=>{preview.disabled=true;health.textContent='Checking the ten VA match sheets against original EA player identities…';try{
     const response=await fetch('/api/league-suite/international-tracker',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'preview-baseline',revision:data.revision})}),plan=await response.json();if(!response.ok)throw Error(plan.error);
     health.textContent=`Verified VA baseline: ${plan.summary.matches} matches · ${plan.summary.goals} goals · ${plan.summary.appearances} player appearances · ${plan.summary.players} players. Existing collected results stay intact. Tonight will use 9:00 / 9:30 PM Central.`;
     const confirm=document.createElement('button');confirm.type='button';confirm.textContent='Import verified VA baseline';tracker.append(confirm);
     confirm.onclick=async()=>{confirm.disabled=true;try{const result=await fetch('/api/league-suite/international-tracker',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'import-baseline',revision:plan.revision,digest:plan.digest})}),saved=await result.json();if(!result.ok)throw Error(saved.error);await loadTracker();}catch(error){health.textContent=error.message;confirm.disabled=false;}};
    }catch(error){health.textContent=error.message;preview.disabled=false;}};
   }
   const action=document.createElement('button');action.type='button';action.textContent=!data.prepared?'Prepare international test':data.enabled?'Stop test collection':'Start automatic test tracking';action.disabled=data.prepared&&!data.enabled&&!data.workerReady;
   action.onclick=async()=>{action.disabled=true;try{const response=await fetch('/api/league-suite/international-tracker',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:!data.prepared?'prepare':data.enabled?'stop':'start',revision:data.revision})}),result=await response.json();if(!response.ok)throw Error(result.error);await loadTracker();}catch(error){health.textContent=error.message;action.disabled=false;}};tracker.append(action);
   if(data.prepared){const link=document.createElement('a');link.className='button';link.href=data.viewUrl;link.textContent='Open test results, table & player stats';tracker.append(link);}
   const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Refresh tracker status';refresh.onclick=loadTracker;tracker.append(refresh);
  }catch(error){const failure=document.createElement('p');failure.textContent=error.message;tracker.append(failure);}
 }
 section.addEventListener('toggle',()=>{if(section.open&&!loaded)load();});
 return section;
}
