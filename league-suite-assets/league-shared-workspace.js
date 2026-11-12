import {buildLeagueSchedule} from './league-engine.js';
import {mergeSharedTestDraft} from './league-va-schedule.js';
import {reconcileTeamClubLinks} from './league-team-linking.js';

// Hydrate authorized server records even when this device has no browser drafts.
// Never create/register a server league or replace unrelated local drafts.
export function reconcileSharedLeagues(localDrafts,rows){
 if(!Array.isArray(rows))throw Error('Shared league response is missing its league list.');
 const next=[...localDrafts],seen=new Set();
 for(const row of rows){
  if(!row?.id||seen.has(row.id)||!row.draft?.settings)throw Error('Invalid shared league record.');
  seen.add(row.id);
  const index=next.findIndex(d=>(d.settings.serverLeagueId||d.settings.trialSchedule)===row.id);
  if(index<0){
   if(row.enabled===0)continue;
   const settings={...row.draft.settings,serverLeagueId:row.id};
   if(settings.trialSchedule&&settings.trialSchedule!==row.id)throw Error('Shared league identity does not match its calendar.');
   const draft=buildLeagueSchedule(settings);
   // Server-accepted decisions are authoritative, including late games and staff corrections.
   // Do not re-run today's candidate window against previously accepted evidence.
   next.push(mergeSharedTestDraft(draft,row.draft));
  }else{
   const merged=mergeSharedTestDraft(next[index],row.draft);
   next[index]=row.draft.settings.vaSchedule?merged:reconcileTeamClubLinks(merged,row.draft.settings.teams);
  }
 }
 return next;
}
