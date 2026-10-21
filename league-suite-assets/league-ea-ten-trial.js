export const EA_TEN_TRIAL_ID='ufl-10v10-20261020';
export const EA_TEN_TEAMS=[['UFL Real Madrid','71042'],['UFL Maykop','374656'],['UFL Milan','48360'],['UFL Timbers','412322'],['UFL TabascoKids','698720'],['UFL Night Shift','30258'],['Palace','23137'],['UFL Newell’s OB','716581']].map(([name,eaClubId],i)=>({id:`ten-team-${i+1}`,name,eaClubId}));
export const EA_TEN_ROUNDS=[[[0,1],[2,3],[4,5],[6,7]],[[1,2],[0,4],[3,6],[5,7]]];
export function eaTenTrialSettings(){return {trialSchedule:EA_TEN_TRIAL_ID,serverLeagueId:EA_TEN_TRIAL_ID,collectionEnabled:true,scoringMode:'standard',season:'UFL Season 2 · EA Test',league:'UFL 10v10 · October 20 EA Trial',format:'10v10',size:10,maxTeamSize:16,keepersEnabled:true,startDate:'2026-10-20',weekday:2,time:'21:00',timeZone:'America/Chicago',spacingMinutes:30,repeatWeeks:1,matchnightCount:1,byePolicy:'fullNight',byePolicyRevision:2,breaks:[],windows:[],teams:EA_TEN_TEAMS.map(t=>({...t})),pagePublished:true};}
export function buildEaTenTrial(settings,toTimestamp){
 if(settings.startDate!=='2026-10-20'||settings.time!=='21:00'||settings.timeZone!=='America/Chicago'||Number(settings.spacingMinutes)!==30)throw Error('This test uses October 20 at 9:00/9:30 PM Central. Create a separate league for other nights.');
 const teams=EA_TEN_TEAMS.map(t=>settings.teams.find(x=>x.id===t.id));if(teams.some(t=>!t)||settings.teams.length!==8)throw Error('This fixed test requires its eight teams.');
 const date='2026-10-20',fixtures=EA_TEN_ROUNDS.flatMap((round,r)=>round.map(([h,a],i)=>({id:`ea-ten-r${r+1}-${i+1}`,week:1,round:r+1,date,startsAt:toTimestamp(date,r?'21:30':'21:00','America/Chicago'),home:teams[h],away:teams[a],status:'scheduled'})));
 return {settings,registrationOpen:false,scheduleGenerated:true,fixtures,nights:[{week:1,date,fixtures,byes:[]}],warnings:['EA-only 10v10 test · Tuesday October 20 · 9:00/9:30 PM Central. Only the eight supplied fixtures count. Missing statistics stay unavailable, not zero.']};
}
