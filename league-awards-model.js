// Award teams are always an XI. League playing size and keeper rules never alter it.
export const AWARD_POSITIONS=['GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','LM','RM','LW','RW','CF','ST'];
export const AWARD_FORMATIONS={
 '3-4-3':[['LW','ST','RW'],['LM','CM','CM','RM'],['CB','CB','CB']],
 '4-3-3':[['LW','ST','RW'],['CM','CM','CM'],['LB','CB','CB','RB']],
 '4-4-2':[['ST','ST'],['LM','CM','CM','RM'],['LB','CB','CB','RB']],
 '4-2-3-1':[['ST'],['LM','CAM','RM'],['CDM','CDM'],['LB','CB','CB','RB']],
 '3-5-2':[['ST','ST'],['LM','CM','CDM','CM','RM'],['CB','CB','CB']],
 '4-1-2-1-2':[['ST','ST'],['CAM'],['CM','CM'],['CDM'],['LB','CB','CB','RB']]
};
const defaults={GK:['GK'],CB:['CB','LB','RB'],LB:['LB','LWB'],RB:['RB','RWB'],CDM:['CDM','CM'],CM:['CM','CDM'],CAM:['CAM','CM'],LM:['LM','LW'],RM:['RM','RW'],LW:['LW','LM'],RW:['RW','RM'],ST:['ST','CF']};
export function awardSlots(formation){
 const rows=AWARD_FORMATIONS[formation];if(!rows)throw Error('Choose an 11-player award formation.');
 const counts={};return [...rows,['GK']].flatMap((row,rowIndex)=>row.map((position,column)=>({id:`${position}-${counts[position]=(counts[position]||0)+1}`,position,width:Math.min(24,78/row.length),x:(column+1)*100/(row.length+1),y:12+rowIndex*76/rows.length})));
}
export const awardLeagueKey=settings=>settings.id||JSON.stringify([settings.season,settings.league,settings.format]);
export function defaultAwardBoard(settings){
 return {type:'week',weekDate:settings.startDate,formation:'3-4-3',minAppearances:1,eligibility:Object.fromEntries(awardSlots('3-4-3').map(slot=>[slot.id,[...(defaults[slot.position]||[slot.position])]])),selections:{}};
}
export function awardBoardKey(board){return `${board.type}:${board.type==='week'?board.weekDate:'season'}`;}
export function validateAwardBoard(board){
 if(!board||!['week','season'].includes(board.type))throw Error('Choose Team of the Week or Team of the Season.');
 if(typeof board.weekDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(board.weekDate)||!Number.isFinite(Date.parse(board.weekDate))||new Date(board.weekDate).toISOString().slice(0,10)!==board.weekDate)throw Error('Choose a valid week start date.');
 const minAppearances=Number(board.minAppearances);if(!Number.isInteger(minAppearances)||minAppearances<1||minAppearances>100)throw Error('Minimum appearances must be 1–100.');
 const slots=awardSlots(board.formation),eligibility={},selections={},seen=new Set();
 if(!board.eligibility||typeof board.eligibility!=='object'||!board.selections||typeof board.selections!=='object')throw Error('Invalid award selection settings.');
 for(const slot of slots){
  const allowed=board.eligibility[slot.id]??defaults[slot.position]??[slot.position];
  if(!Array.isArray(allowed)||!allowed.length||new Set(allowed).size!==allowed.length||allowed.some(position=>!AWARD_POSITIONS.includes(position)||(slot.position==='GK'?position!=='GK':position==='GK')))throw Error('Select at least one eligible position. Goalkeepers qualify only for goalkeeper.');
  eligibility[slot.id]=[...allowed];const player=board.selections[slot.id];if(!player)continue;
  if(typeof player.id!=='string'||!player.id||player.id.length>100||seen.has(player.id)||typeof player.name!=='string'||!player.name.trim()||player.name.length>100||typeof player.teamId!=='string'||typeof player.teamName!=='string'||player.teamName.length>100||!Array.isArray(player.positions)||!player.positions.some(position=>allowed.includes(position))||!Number.isFinite(player.averageRating)||player.averageRating<0||player.averageRating>10||!Number.isInteger(player.appearances)||player.appearances<minAppearances)throw Error('Invalid or duplicate player in the award lineup.');
  const safeImage=url=>{if(!url)return '';if(typeof url!=='string'||url.length>2000)throw Error('Invalid player artwork.');if(/^\/assets\/[a-z0-9_./%-]+$/i.test(url)&&!url.includes('..'))return url;let parsed;try{parsed=new URL(url);}catch{throw Error('Invalid player artwork.');}if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Use safe HTTPS artwork.');return url;};
  seen.add(player.id);selections[slot.id]={id:player.id,name:player.name,teamId:player.teamId,teamName:player.teamName,positions:[...player.positions],averageRating:player.averageRating,appearances:player.appearances,portraitUrl:safeImage(player.portraitUrl),badgeUrl:safeImage(player.badgeUrl)};
 }
 if(Object.keys(board.selections).some(id=>!slots.some(slot=>slot.id===id)))throw Error('Saved positions do not match the award formation.');
 return {type:board.type,weekDate:board.weekDate,formation:board.formation,minAppearances,eligibility,selections};
}
export function awardPeriod(board){
 const end=new Date(`${board.weekDate}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+6);
 return board.type==='week'?{from:board.weekDate,to:end.toISOString().slice(0,10)}:{from:null,to:null};
}
export function rankAwardCandidates(records,{leagueKey,season,timeZone,board,slotId,excludeDisconnectRatings=true}){
 const slots=awardSlots(board.formation),slot=slots.find(slot=>slot.id===slotId);if(!slot)throw Error('Choose an award position.');
 const allowed=board.eligibility[slotId]||defaults[slot.position]||[slot.position],period=awardPeriod(board),rows=new Map(),seen=new Set();
 for(const record of records){
  if(record.status!=='accepted'||record.leagueKey!==leagueKey||record.season!==season||!record.matchId||typeof record.playerId!=='string'||!record.playerId||typeof record.name!=='string'||!record.name.trim()||typeof record.teamId!=='string'||typeof record.teamName!=='string'||!allowed.includes(record.position))continue;
  const timestamp=Number(record.timestamp);if(!Number.isFinite(timestamp))continue;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(timestamp);
  if(period.from&&(day<period.from||day>period.to))continue;
  const key=JSON.stringify([record.matchId,record.playerId]);if(seen.has(key))continue;seen.add(key);
  let player=rows.get(record.playerId);if(!player){player={id:record.playerId,name:record.name,teamId:record.teamId,teamName:record.teamName,portraitUrl:record.portraitUrl||'',badgeUrl:record.badgeUrl||'',appearances:0,ratingCount:0,ratingTotal:0,positions:[]};rows.set(record.playerId,player);}
  player.appearances++;if(!player.positions.includes(record.position))player.positions.push(record.position);
  const rating=record.rating;if(typeof rating==='number'&&Number.isFinite(rating)&&rating>0&&rating<=10&&!(excludeDisconnectRatings&&rating===3)){player.ratingCount++;player.ratingTotal+=rating;}
 }
 return [...rows.values()].filter(player=>player.appearances>=board.minAppearances&&player.ratingCount).map(player=>({...player,averageRating:player.ratingTotal/player.ratingCount})).sort((a,b)=>b.averageRating-a.averageRating||b.appearances-a.appearances||a.name.localeCompare(b.name));
}
export function assignAwardCandidate(board,slotId,player){
 if(Object.entries(board.selections).some(([id,selected])=>id!==slotId&&selected.id===player.id))throw Error('That player is already selected. Remove them from their current slot first.');
 return validateAwardBoard({...board,selections:{...board.selections,[slotId]:player}});
}
