import {zonedTimestamp} from './league-engine.js';
export function splitDivisionPools(divisions){
 if(!Array.isArray(divisions)||divisions.length!==2||divisions[0].key===divisions[1].key)throw Error('Choose two different divisions.');
 const ucl=[],uel=[];
 for(const division of divisions){if(!division.rows?.length)throw Error('Both divisions need ranked teams.');const split=Math.ceil(division.rows.length/2);division.rows.forEach((team,i)=>(i<split?ucl:uel).push({...team,id:`${division.key}:${team.id}`}));}
 return {ucl,uel};
}
export function createCupSchedule({id,name,teams,format,legs,startDate,weekday,time,timeZone,spacingMinutes=30},random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
 if(typeof id!=='string'||!id.startsWith('cup-')||typeof name!=='string'||!name.trim()||name.length>80)throw Error('Name the cup.');
 if(!Array.isArray(teams)||teams.length<2||teams.length>64||new Set(teams.map(t=>t.id)).size!==teams.length)throw Error('Select 2–64 unique teams.');
 const clubIds=teams.map(t=>t.eaClubId).filter(Boolean);if(new Set(clubIds).size!==clubIds.length)throw Error('One EA club cannot enter a cup twice.');
 if(!['knockout','roundRobin'].includes(format)||![1,2].includes(Number(legs))||!Number.isInteger(Number(weekday))||weekday<0||weekday>6||!Number.isInteger(Number(spacingMinutes))||spacingMinutes<15||spacingMinutes>180)throw Error('Choose a cup format, day and valid kickoff spacing.');
 zonedTimestamp(startDate,time,timeZone);
 const shuffled=teams.map(t=>({id:t.id,name:t.name,eaClubId:t.eaClubId||''}));for(let i=shuffled.length-1;i>0;i--){const value=random();if(value<0||value>=1)throw Error('Invalid draw random source.');const j=Math.floor(value*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const cursor=new Date(startDate+'T12:00:00Z');cursor.setUTCDate(cursor.getUTCDate()+(Number(weekday)-cursor.getUTCDay()+7)%7);const rounds=[];
 if(format==='roundRobin'){
  const rotation=[...shuffled];if(rotation.length%2)rotation.push(null);
  for(let r=0;r<rotation.length-1;r++){const ties=[];for(let i=0;i<rotation.length/2;i++){const a=rotation[i],b=rotation.at(-1-i);if(a&&b)ties.push({home:r%2?b:a,away:r%2?a:b});}rounds.push(ties);rotation.splice(1,0,rotation.pop());}
  if(Number(legs)===2)rounds.push(...rounds.map(ties=>ties.map(t=>({home:t.away,away:t.home}))));
 }else{
  const power=2**Math.ceil(Math.log2(shuffled.length)),byes=power-shuffled.length,first=[];let index=0;
  for(let i=0;i<power/2;i++)first.push({home:shuffled[index++],away:i<byes?null:shuffled[index++]});rounds.push(first);
  while(rounds.at(-1).length>1){const previous=rounds.at(-1),r=rounds.length,slots=previous.map((tie,i)=>tie.away?{id:`winner-${r}-${i+1}`,name:`Winner R${r} tie ${i+1}`,pending:true}:tie.home),next=[];for(let i=0;i<slots.length;i+=2)next.push({home:slots[i],away:slots[i+1]});rounds.push(next);}
 }
 const fixtures=[];rounds.forEach((ties,r)=>{const date=cursor.toISOString().slice(0,10);ties.forEach((tie,i)=>{for(let leg=0;leg<(format==='knockout'&&tie.away?Number(legs):1);leg++)fixtures.push({id:`${id}-r${r+1}-t${i+1}-l${leg+1}`,competitionId:id,round:r+1,tie:i+1,leg:leg+1,date,startsAt:zonedTimestamp(date,time,timeZone)+leg*Number(spacingMinutes)*60000,home:leg%2?tie.away:tie.home,away:leg%2?tie.home:tie.away,status:!tie.away?'bye':tie.home.pending||tie.away.pending?'awaiting-winners':'scheduled'});});cursor.setUTCDate(cursor.getUTCDate()+7);});
 return {id,name:name.trim(),format,legs:Number(legs),startDate,weekday:Number(weekday),time,timeZone,teams:shuffled,fixtures};
}
export function validateCupPlans(plans){
 if(!Array.isArray(plans)||plans.length>20)throw Error('Save up to 20 cup plans per league.');
 for(const plan of plans){if(!plan||typeof plan.id!=='string'||!plan.id.startsWith('cup-')||typeof plan.name!=='string'||!plan.name.trim()||plan.name.length>80||!Array.isArray(plan.fixtures)||plan.fixtures.length>500||!['knockout','roundRobin'].includes(plan.format))throw Error('Invalid cup plan.');for(const f of plan.fixtures){if(f.competitionId!==plan.id||typeof f.id!=='string'||!Number.isFinite(f.startsAt)||typeof f.home?.name!=='string'||f.away&&typeof f.away.name!=='string')throw Error('Invalid competition-scoped fixture.');}}
 if(new Set(plans.map(p=>p.id)).size!==plans.length)throw Error('Duplicate cup identity.');return structuredClone(plans);
}
