export function validWorkshopTeamId(id,trialSchedule,internationalSchedule){
 return typeof id==='string'&&(/^team-\d+$/.test(id)||(trialSchedule==='ufl-10v10-20261020'&&/^ten-team-[1-8]$/.test(id))||(internationalSchedule?.competitionId==='ufl-internationals'&&['ARG','BRA','CAN','ENG','ESP','FRA','GER','ITA','MEX','USA'].includes(id)));
}
