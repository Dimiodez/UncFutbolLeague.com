// Shared full-XI geometry for awards, future team selection and roster screens.
// Coordinates are percentages: attack at top, GK at bottom, team's left at left.
// Reference reviewed 2026-10-08: https://www.fifplay.com/fc-27/formations/
// Store facts/our geometry only, not third-party diagram artwork or descriptions.
export const FORMATION_CATALOGUE_VERSION=1;
export const FOOTBALL_POSITIONS=['GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','LM','RM','LW','RW','CF','ST'];
const back3=[['CB',25,76],['CB',50,76],['CB',75,76]];
const back4=[['LB',12,74],['CB',37,77],['CB',63,77],['RB',88,74]];
const back5=[['LB',10,69,17],['CB',30,77,17],['CB',50,77,17],['CB',70,77,17],['RB',90,69,17]];
const front2=[['ST',33,11],['ST',67,11]];
const front3=[['LW',20,17],['ST',50,11],['RW',80,17]];
const flat4=[['LM',12,44],['CM',37,47],['CM',63,47],['RM',88,44]];
const shapes={
 '3-1-4-2':[...front2,['LM',10,42,17],['CM',30,44,17],['CDM',50,59,17],['CM',70,44,17],['RM',90,42,17],...back3],
 '3-4-1-2':[...front2,['CAM',50,28],['LM',12,43],['CM',35,59],['CM',65,59],['RM',88,43],...back3],
 '3-4-2-1':[['CAM',25,25],['ST',50,11],['CAM',75,25],['LM',12,44],['CM',35,59],['CM',65,59],['RM',88,44],...back3],
 '3-4-3':[...front3,...flat4,...back3],
 '3-5-2':[...front2,['CAM',50,28],['LM',12,43],['CDM',35,59],['CDM',65,59],['RM',88,43],...back3],
 '4-1-2-1-2':[...front2,['CAM',50,28],['LM',12,44],['RM',88,44],['CDM',50,59],...back4],
 '4-1-2-1-2 (2)':[...front2,['CAM',50,28],['CM',27,44],['CM',73,44],['CDM',50,59],...back4],
 '4-1-3-2':[...front2,['LM',12,42],['CM',50,36],['RM',88,42],['CDM',50,59],...back4],
 '4-1-4-1':[['ST',50,11],...flat4,['CDM',50,61],...back4],
 '4-2-1-3':[...front3,['CAM',50,38],['CDM',30,59],['CDM',70,59],...back4],
 '4-2-2-2':[...front2,['CAM',25,36],['CAM',75,36],['CDM',35,59],['CDM',65,59],...back4],
 '4-2-3-1':[['ST',50,11],['CAM',25,30],['CAM',50,44],['CAM',75,30],['CDM',28,60],['CDM',72,60],...back4],
 '4-2-3-1 (2)':[['ST',50,11],['LM',12,36],['CAM',50,39],['RM',88,36],['CDM',30,59],['CDM',70,59],...back4],
 '4-2-4':[['LW',12,23],['ST',37,11],['ST',63,11],['RW',88,23],['CM',35,49],['CM',65,49],...back4],
 '4-3-1-2':[...front2,['CAM',50,28],['CM',25,47],['CM',50,59],['CM',75,47],...back4],
 '4-3-2-1':[['CAM',25,25],['ST',50,11],['CAM',75,25],['CM',25,49],['CM',50,56],['CM',75,49],...back4],
 '4-3-3':[...front3,['CM',25,46],['CM',50,53],['CM',75,46],...back4],
 '4-3-3 (2)':[...front3,['CM',25,44],['CM',75,44],['CDM',50,60],...back4],
 '4-3-3 (3)':[...front3,['CM',50,40],['CDM',25,58],['CDM',75,58],...back4],
 '4-3-3 (4)':[...front3,['CAM',50,36],['CM',25,51],['CM',75,51],...back4],
 '4-4-1-1 Midfield':[['ST',50,11],['CAM',50,32],...flat4,...back4],
 '4-4-2':[...front2,...flat4,...back4],
 '4-4-2 (2)':[...front2,['LM',12,39],['CDM',37,57],['CDM',63,57],['RM',88,39],...back4],
 '4-5-1':[['ST',50,11],['CAM',30,29],['CAM',70,29],['LM',12,45],['CM',50,55],['RM',88,45],...back4],
 '4-5-1 (2)':[['ST',50,11],['LM',10,38,17],['CM',30,51,17],['CM',50,58,17],['CM',70,51,17],['RM',90,38,17],...back4],
 '5-2-1-2':[...front2,['CAM',50,30],['CM',33,48],['CM',67,48],...back5],
 '5-2-3':[...front3,['CM',33,47],['CM',67,47],...back5],
 '5-3-2':[...front2,['CM',25,41],['CDM',50,56],['CM',75,41],...back5],
 '5-4-1':[['ST',50,11],['LM',12,34],['CM',35,50],['CM',65,50],['RM',88,34],...back5]
};
// Distinct labels share geometry where they denote the same shape. No game-mode gates.
const aliases={
 '3-4-3 Flat':'3-4-3',
 '4-1-2-1-2 Narrow':'4-1-2-1-2 (2)','4-1-2-1-2 Wide':'4-1-2-1-2',
 '4-2-3-1 Narrow':'4-2-3-1','4-2-3-1 Wide':'4-2-3-1 (2)',
 '4-3-3 Attack':'4-3-3 (4)','4-3-3 Defend':'4-3-3 (3)','4-3-3 Flat':'4-3-3','4-3-3 Holding':'4-3-3 (2)',
 '4-4-2 Flat':'4-4-2','4-4-2 Holding':'4-4-2 (2)',
 '4-5-1 Attack':'4-5-1','4-5-1 Flat':'4-5-1 (2)',
 '5-3-2 Holding':'5-3-2','5-4-1 Flat':'5-4-1'
};
const names=[
 '3-1-4-2','3-4-1-2','3-4-2-1','3-4-3','3-4-3 Flat','3-5-2',
 '4-1-2-1-2','4-1-2-1-2 (2)','4-1-2-1-2 Narrow','4-1-2-1-2 Wide','4-1-3-2','4-1-4-1','4-2-1-3','4-2-2-2','4-2-3-1','4-2-3-1 (2)','4-2-3-1 Narrow','4-2-3-1 Wide','4-2-4','4-3-1-2','4-3-2-1','4-3-3','4-3-3 (2)','4-3-3 (3)','4-3-3 (4)','4-3-3 Attack','4-3-3 Defend','4-3-3 Flat','4-3-3 Holding','4-4-1-1 Midfield','4-4-2','4-4-2 (2)','4-4-2 Flat','4-4-2 Holding','4-5-1','4-5-1 (2)','4-5-1 Attack','4-5-1 Flat',
 '5-2-1-2','5-2-3','5-3-2','5-3-2 Holding','5-4-1','5-4-1 Flat'
];
function freeze(value){Object.values(value).forEach(child=>{if(child&&typeof child==='object')freeze(child);});return Object.freeze(value);}
export const FC27_FORMATIONS=freeze(Object.fromEntries(names.map(name=>{
 const layoutId=aliases[name]||name,counts={};
 const slots=[...shapes[layoutId],['GK',50,93]].map(([position,x,y,width=22])=>({id:`${position}-${counts[position]=(counts[position]||0)+1}`,position,x,y,width}));
 return [name,{id:name.toLowerCase().replace(/[()]/g,'').replaceAll(' ','-'),name,layoutId,version:FORMATION_CATALOGUE_VERSION,slots}];
})));
export function formationSlots(name){
 if(!Object.hasOwn(FC27_FORMATIONS,name))throw Error('Choose an 11-player formation.');
 return FC27_FORMATIONS[name].slots.map(slot=>({...slot}));
}
