import {buildLeagueSchedule} from './league-engine.js';

const geometry=fixtures=>JSON.stringify(fixtures.map(f=>[f.id,f.startsAt,f.home.id,f.away.id]));
function refreshLinks(draft,teams){
 const settings={...draft.settings,teams};
 if(!draft.scheduleGenerated)return {...draft,settings};
 const rebuilt=buildLeagueSchedule(settings);
 if(geometry(rebuilt.fixtures)!==geometry(draft.fixtures))throw Error('Club linking must not change fixtures or kickoff times. Review this calendar first.');
 return {...draft,settings,fixtures:rebuilt.fixtures,nights:rebuilt.nights};
}
export function linkDraftTeamClub(draft,teamId,club){
 const team=draft.settings.teams.find(t=>t.id===teamId);
 if(!team)throw Error('Team not found in this league.');
 if(!/^\d{1,20}$/.test(String(club?.id??''))||typeof club?.name!=='string'||!club.name.trim()||club.name.length>80||club.platform!=='common-gen5')throw Error('Choose a valid EA club search result.');
 if(draft.settings.teams.some(t=>t.id!==teamId&&String(t.eaClubId)===club.id))throw Error('That EA club is already linked to another team in this league.');
 if(String(team.eaClubId||'')!==club.id){
  if(team.eaClubReplacement)throw Error('This team has a dated club replacement. Staff must review that history before changing its club link.');
  const recorded=[...(draft.acceptedResults||[]),...(draft.pendingResults||[])];
  if(recorded.some(r=>{const f=draft.fixtures.find(f=>f.id===r.fixtureId);return !f||f.home.id===teamId||f.away.id===teamId;}))throw Error('This team already has recorded matches. Use a reviewed, dated club replacement instead of changing its historical ID.');
 }
 const eaClubLink={id:club.id,name:club.name,platform:club.platform,verifiedAt:club.verifiedAt};
 return refreshLinks(draft,draft.settings.teams.map(t=>t.id===teamId?{...t,eaClubId:club.id,eaClubLink}:t));
}
// Server club links are authoritative, but unrelated local settings/results stay intact.
export function reconcileTeamClubLinks(draft,serverTeams){
 if(!Array.isArray(serverTeams)||serverTeams.length!==draft.settings.teams.length||serverTeams.some(t=>!draft.settings.teams.some(local=>local.id===t.id)))throw Error('Shared team list changed. Refresh the league before linking clubs.');
 const teams=draft.settings.teams.map(team=>{const remote=serverTeams.find(t=>t.id===team.id);return {...team,eaClubId:remote.eaClubId||'',eaClubLink:remote.eaClubLink,eaClubReplacement:remote.eaClubReplacement};});
 return refreshLinks(draft,teams);
}
