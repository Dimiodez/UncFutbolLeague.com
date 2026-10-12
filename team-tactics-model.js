import {FC27_FORMATIONS,formationSlots} from './fc27-formations.js';
export const PHASES={attack:'Attacking',defence:'Defending',transition:'Transitions',setpiece:'Set pieces'};
export function newTactic(name='New tactical board',phase='attack',formation='4-3-3'){
 return {id:crypto.randomUUID(),name,phase,formation,notes:'',slots:formationSlots(formation).map(s=>({id:s.id,x:s.x,y:s.y,playerId:null,instruction:''})),arrows:[],opponents:[],ball:{x:50,y:50}};
}
export function assignPlayer(board,slotId,playerId){
 const target=board.slots.find(s=>s.id===slotId);if(!target)throw Error('Select a position.');
 // Moving between occupied positions swaps players; roster picks release the old slot.
 const previous=playerId&&board.slots.find(s=>s.playerId===playerId&&s.id!==slotId),old=target.playerId;
 for(const slot of board.slots){if(slot===target)slot.playerId=playerId;else if(slot===previous)slot.playerId=old;}
 return board;
}
export function changeFormation(board,formation){
 const old=[...board.slots],used=new Set();
 board.slots=formationSlots(formation).map(slot=>{const prior=old.find(s=>s.id===slot.id&&!used.has(s));if(prior)used.add(prior);return {id:slot.id,x:slot.x,y:slot.y,playerId:prior?.playerId||null,instruction:prior?.instruction||''};});
 const remaining=old.filter(s=>!used.has(s)&&s.playerId);
 for(const slot of board.slots.filter(s=>!s.playerId)){const prior=remaining.shift();if(prior){slot.playerId=prior.playerId;slot.instruction=prior.instruction;}}
 board.formation=formation;return board;
}
const text=(v,max)=>typeof v==='string'&&v.length<=max;
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=3&&p.x<=97&&p.y>=3&&p.y<=97;
export function validatePlaybook(input,roster){
 if(!input||input.version!==1||!Array.isArray(input.boards)||input.boards.length>30)throw Error('A playbook supports up to 30 boards.');
 const people=new Set(roster.map(p=>p.id)),ids=new Set();
 for(const b of input.boards){
  if(!b||!text(b.id,80)||!b.id||ids.has(b.id)||!text(b.name,80)||!b.name.trim()||!Object.hasOwn(PHASES,b.phase)||!Object.hasOwn(FC27_FORMATIONS,b.formation)||!text(b.notes,5000))throw Error('Check the board name, phase and formation.');
  ids.add(b.id);const expected=formationSlots(b.formation),positions=new Set(),assigned=new Set();
  if(!Array.isArray(b.slots)||b.slots.length!==11)throw Error('Each formation needs eleven positions.');
  for(const s of b.slots){if(!s||!point(s)||!expected.some(e=>e.id===s.id)||positions.has(s.id)||!text(s.instruction,500))throw Error('Invalid position or player instruction.');positions.add(s.id);
   if(s.playerId!==null){if(!people.has(s.playerId)||assigned.has(s.playerId))throw Error('Use current registered players once per board.');assigned.add(s.playerId);}
  }
  if(!point(b.ball)||!Array.isArray(b.opponents)||b.opponents.length>11||b.opponents.some(p=>!point(p))||!Array.isArray(b.arrows)||b.arrows.length>30||b.arrows.some(a=>!a||!point(a.from)||!point(a.to)))throw Error('Check the ball, opponents and movement arrows.');
 }
 // Keep only known fields, rather than persisting arbitrary client payloads.
 return {version:1,boards:input.boards.map(b=>({id:b.id,name:b.name.trim(),phase:b.phase,formation:b.formation,notes:b.notes,slots:b.slots.map(s=>({id:s.id,x:s.x,y:s.y,playerId:s.playerId,instruction:s.instruction})),arrows:b.arrows.map(a=>({from:{x:a.from.x,y:a.from.y},to:{x:a.to.x,y:a.to.y}})),opponents:b.opponents.map(p=>({x:p.x,y:p.y})),ball:{x:b.ball.x,y:b.ball.y}}))};
}
