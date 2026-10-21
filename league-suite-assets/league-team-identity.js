export function validWorkshopTeamId(id,trialSchedule){
 return typeof id==='string'&&(/^team-\d+$/.test(id)||(trialSchedule==='ufl-10v10-20261020'&&/^ten-team-[1-8]$/.test(id)));
}
