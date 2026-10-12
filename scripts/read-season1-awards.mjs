// Read-only importer: emits sanitized, verified public archive records to stdout.
const base='https://ufl.virtualarena.app/competitions/1/seasons/1/squads';
async function read(id){
 const response=await fetch(`${base}/${id}`);
 if(!response.ok)throw new Error(`VA HTTP ${response.status}`);
 const html=await response.text(),match=html.match(/data-page="([^"]+)"/);
 const props=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&#039;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&')).props;
 const squad=props.selectedSquad;
 if(props.competition.id!==1||props.season.id!==1||squad.id!==id||squad.type!=='totw'||squad.formation!=='352')throw new Error('Unexpected archive');
 const rounds=squad.rounds.split('-').map(Number),gameweek=(rounds[0]+1)/2;
 if(rounds[1]!==rounds[0]+1||!Number.isInteger(gameweek))throw new Error('Unexpected rounds');
 const players=Object.entries(props.squadPlayers).map(([slot,p])=>{
  if(squad.players[slot]!==p.id||!p.name)throw new Error('Player mismatch');
  const image=p.image&&new URL(p.image);
  if(image&&(image.protocol!=='https:'||image.hostname!=='ufl.virtualarena.app'))throw new Error('Unexpected image');
  return {slot:Number(slot.replace('squad-id-','')),id:p.id,name:p.name,image:image?.href||''};
 }).sort((a,b)=>a.slot-b.slot);
 if(players.length!==10||players.some((p,i)=>p.slot!==i+1))throw new Error('Unexpected slots');
 return {season:'1',division:'6v6',kind:'totw',published:true,gameweek,rounds,formation:squad.formation,source:`${base}/${id}`,players};
}
const records=[];
for(const id of [10,12,13,15,16,17,18,19,21])records.push(await read(id));
console.log(JSON.stringify(records,null,2));
