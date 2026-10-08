import assert from 'node:assert/strict';
import {FC27_FORMATIONS,FOOTBALL_POSITIONS,formationSlots} from '../fc27-formations.js';
import {defaultAwardBoard,validateAwardBoard} from '../league-awards-model.js';
assert.equal(Object.keys(FC27_FORMATIONS).length,44);
assert.equal(new Set(Object.values(FC27_FORMATIONS).map(f=>f.id)).size,44);
for(const [name,formation] of Object.entries(FC27_FORMATIONS)){
 const slots=formationSlots(name);
 assert.equal(slots.length,11,name);assert.equal(slots.filter(s=>s.position==='GK').length,1,name);
 assert.equal(new Set(slots.map(s=>s.id)).size,11,name);
 assert.ok(Object.isFrozen(formation.slots));
 for(const slot of slots){assert.ok(FOOTBALL_POSITIONS.includes(slot.position));assert.ok(slot.x-slot.width/2>=0&&slot.x+slot.width/2<=100);assert.ok(slot.y>=10&&slot.y<=93);}
 const keeper=slots.find(s=>s.position==='GK');assert.ok(slots.every(s=>s===keeper||s.y<keeper.y));
 // All cards fit the shared export geometry, including staggered rows.
 for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
  const a=slots[i],b=slots[j];
  assert.ok(Math.abs(a.x-b.x)*14.6 >= (Math.min(264,a.width*14.6)+Math.min(264,b.width*14.6))/2 || Math.abs(a.y-b.y)*14.1>=190,`${name}: overlapping ${a.id}/${b.id}`);
 }
 const board=validateAwardBoard({...defaultAwardBoard({startDate:'2026-10-08'}),formation:name,eligibility:{}});
 assert.equal(Object.keys(board.eligibility).length,11);
 slots[0].x=99;assert.notEqual(formationSlots(name)[0].x,99,'caller cannot mutate catalogue');
}
const roles=name=>formationSlots(name).map(s=>s.position);
assert.equal(roles('3-5-2').filter(p=>p==='CDM').length,2);assert.ok(roles('3-5-2').includes('CAM'));
assert.equal(roles('4-2-3-1').filter(p=>p==='CAM').length,3);
assert.ok(roles('4-2-3-1 Wide').includes('LM'));assert.ok(!roles('4-2-3-1 Narrow').includes('LM'));
assert.ok(roles('4-1-2-1-2 Wide').includes('LM'));assert.ok(roles('4-1-2-1-2 Narrow').includes('CM'));
assert.equal(roles('4-3-3 Defend').filter(p=>p==='CDM').length,2);
assert.equal(roles('4-3-3 Holding').filter(p=>p==='CDM').length,1);
const legacy=defaultAwardBoard({startDate:'2026-10-08'});delete legacy.formationVersion;
for(const [oldName,newName] of [['4-2-3-1','4-2-3-1 Wide'],['3-5-2','3-1-4-2'],['4-1-2-1-2','4-1-2-1-2 Narrow']])assert.equal(validateAwardBoard({...legacy,formation:oldName,eligibility:{}}).formation,newName);
assert.throws(()=>formationSlots('constructor'));assert.throws(()=>formationSlots('__proto__'));
console.log('PASS: all 44 formations, full XI, distinct roles, shared geometry, no export card overlaps, immutable catalogue and legacy migration.');
