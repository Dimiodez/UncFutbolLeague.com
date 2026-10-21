import {validateAwardBoard,awardSlots,awardLeagueKey} from './league-awards-model.js';
export function awardComplete(board){return awardSlots(board.formation).filter(slot=>slot.position!=='GK').every(slot=>board.selections[slot.id]);}
export function validatePublication(payload){
 if(!payload||payload.demo)throw Error('Sample lineups cannot be published.');
 const source=payload.settings||{},settings={};
 for(const key of ['league','season','timeZone']){if(typeof source[key]!=='string'||!source[key].trim()||source[key].length>100)throw Error('Choose a league, season and timezone.');settings[key]=source[key].trim();}
 if(!['6v6','10v10'].includes(source.format))throw Error('Publish awards for a 6v6 or 10v10 league.');settings.format=source.format;
 try{new Intl.DateTimeFormat('en',{timeZone:settings.timeZone});}catch{throw Error('Choose a valid timezone.');}
 const leagueKey=awardLeagueKey(source);if(typeof leagueKey!=='string'||leagueKey.length>500)throw Error('Invalid league identity.');
 const board=validateAwardBoard(payload.board);
 if(!awardComplete(board))throw Error('Select all ten outfield players before publishing. The goalkeeper is optional.');
 if(Object.values(board.selections).some(player=>player.id.startsWith('sample-')||player.teamId.startsWith('sample-')))throw Error('Sample players cannot be published.');
 const weekNumber=board.type==='week'?Number(payload.weekNumber):null;
 if(board.type==='week'&&(!Number.isInteger(weekNumber)||weekNumber<1||weekNumber>100))throw Error('Choose a week number from 1 to 100.');
 const revision=payload.revision??0;if(!Number.isInteger(revision)||revision<0)throw Error('Invalid publication revision.');
 return {settings,leagueKey,board,weekNumber,revision};
}
export const publicationIdentity=p=>JSON.stringify([p.settings.season,p.settings.format,p.leagueKey,p.board.type,p.weekNumber]);
// AI keeper is presentation-only: never a player award, rating or roster member.
export const officialAwardPlayers=board=>Object.entries(board.selections).map(([slotId,player])=>({slotId,...player}));
