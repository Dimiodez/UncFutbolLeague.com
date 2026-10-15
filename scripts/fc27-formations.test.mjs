import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FC27_FORMATIONS,FC27_FORMATION_OPTIONS,canonicalFormationName,formationSlots} from '../fc27-formations.js';
import {newTactic,validatePlaybook} from '../team-tactics-model.js';
const expected=["3-1-4-2","3-4-1-2","3-4-2-1","3-4-3 Flat","3-5-2","4-1-2-1-2 Narrow","4-1-2-1-2 Wide","4-1-3-2","4-1-4-1","4-2-1-3","4-2-2-2","4-2-3-1 Narrow","4-2-3-1 Wide","4-2-4","4-3-1-2","4-3-2-1","4-3-3 Attack","4-3-3 Defend","4-3-3 Flat","4-3-3 Holding","4-4-1-1 Midfield","4-4-2 Flat","4-4-2 Holding","4-5-1 Attack","4-5-1 Flat","5-2-1-2","5-2-3","5-3-2 Holding","5-4-1 Flat"];
const signature=name=>JSON.stringify(formationSlots(name).map(({position,x,y})=>[position,x,y]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
test('Clubs picker retains all 29 current distinct shapes, with no duplicate names or layouts',()=>{
 assert.deepEqual(FC27_FORMATION_OPTIONS,expected);
 assert.equal(new Set(FC27_FORMATION_OPTIONS.map(n=>n.toLowerCase())).size,29);
 assert.equal(new Set(FC27_FORMATION_OPTIONS.map(signature)).size,29);
 for(const name of expected){const slots=formationSlots(name);assert.equal(slots.length,11);assert.equal(slots.filter(s=>s.position==='GK').length,1);assert.equal(new Set(slots.map(s=>s.id)).size,11);}
});
test('every old label maps to exactly one selectable Clubs formation without changing geometry',()=>{
 for(const name of Object.keys(FC27_FORMATIONS)){
  const canonical=canonicalFormationName(name);assert.ok(expected.includes(canonical),name);
  assert.deepEqual(formationSlots(name),formationSlots(canonical),name);
 }
 assert.equal(canonicalFormationName('4-3-3 (4)'),'4-3-3 Attack');
 assert.equal(canonicalFormationName('4-1-2-1-2 (2)'),'4-1-2-1-2 Narrow');
 assert.throws(()=>canonicalFormationName('__proto__'));
});
test('saved boards with alternate labels retain player assignments, custom coordinates and instructions',()=>{
 for(const name of Object.keys(FC27_FORMATIONS)){
  const b=newTactic('Saved plan','attack',name);b.slots[0].playerId='p';b.slots[0].instruction='Hold width';b.slots[0].x=24;
  const saved=validatePlaybook({version:1,boards:[b]},[{id:'p'}]);
  assert.deepEqual(saved.boards[0],b);
 }
});
test('team hub renders only canonical options while selecting old board aliases correctly',()=>{
 const source=fs.readFileSync(new URL('../team-hub.js',import.meta.url),'utf8');
 assert.match(source,/FC27_FORMATION_OPTIONS\.map/);
 assert.match(source,/canonicalFormationName\(b\.formation\)===f/);
 assert.doesNotMatch(source,/Object\.keys\(FC27_FORMATIONS\)/);
});
