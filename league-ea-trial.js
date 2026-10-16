// User-supplied October 15 fixtures. No VA links, fetches or imported results.
export const EA_TRIAL_ID='ufl-6v6-20261015';
export const EA_TRIAL_TEAMS=[
 ['UFL Italia',''],['UFL Toluca','1197975'],['UFL Bayern','1194187'],['UFL Rippettes',''],['UFL Arsenal','1597678'],['UFL Druzhba','1597742'],['UFL Ta6asco Kids','1330650'],['UFL Pumas UNAM','1663505'],['UFL LAFC','1565032'],['UFL Roma','1236403']
].map(([name,eaClubId],i)=>({id:`team-${i+1}`,name,eaClubId}));
export const EA_TRIAL_ROUNDS=[[[0,1],[2,3],[4,5],[6,7],[8,9]],[[1,2],[0,4],[3,6],[5,8],[7,9]]];
export function eaTrialSettings(){return {trialSchedule:EA_TRIAL_ID,season:'UFL Season 2 · EA Test',league:'UFL 6v6 · October 15 EA Trial',format:'6v6',size:6,maxTeamSize:8,keepersEnabled:false,startDate:'2026-10-15',weekday:4,time:'21:00',timeZone:'America/Chicago',spacingMinutes:30,repeatWeeks:1,matchnightCount:1,byePolicy:'fullNight',byePolicyRevision:2,breaks:[],windows:[],teams:EA_TRIAL_TEAMS.map(t=>({...t})),pagePublished:true};}
export function buildEaTrial(settings,toTimestamp){
 if(settings.startDate!=='2026-10-15'||settings.time!=='21:00'||settings.timeZone!=='America/Chicago'||Number(settings.spacingMinutes)!==30)throw Error('The trial follows the supplied October 15, 9:00/9:30 PM Central schedule. Create a separate draft for different dates or times.');
 const teams=EA_TRIAL_TEAMS.map(t=>settings.teams.find(x=>x.id===t.id));
 if(teams.some(t=>!t)||settings.teams.length!==10)throw Error('This fixed Gameweek 1 trial requires its ten teams. Update club IDs without removing teams.');
 const date='2026-10-15',fixtures=EA_TRIAL_ROUNDS.flatMap((round,r)=>round.map(([h,a],i)=>({id:`ea-trial-r${r+1}-${i+1}`,week:1,round:r+1,date,startsAt:toTimestamp(date,r?'21:30':'21:00','America/Chicago'),home:teams[h],away:teams[a],status:'scheduled'})));
 return {settings,registrationOpen:false,scheduleGenerated:true,fixtures,nights:[{week:1,date,fixtures,byes:[]}],warnings:['EA-only parallel test. Only Gameweek 1 is scheduled; no later fixtures have been invented. Missing club IDs stay pending, never forfeits. Standings start at zero; historical practice games do not count.']};
}
