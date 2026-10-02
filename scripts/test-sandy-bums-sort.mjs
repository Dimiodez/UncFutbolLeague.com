import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=source.indexOf('const sandyBumsColumns=');
const end=source.indexOf('async function hydrateSandyBums(',start);
assert.ok(start>=0&&end>start,'Sandy Bums sort helpers must exist');
const context={};
vm.runInNewContext(`${source.slice(start,end)}\nglobalThis.testSort={state:sandyBumsSort,sort:sortedSandyBumsPlayers};`,context);
const {state,sort}=context.testSort;
const players=[
 {latest_name:'Zulu',appearances:2,goals:3,assists:1,average_rating:8.1},
 {latest_name:'Alpha',appearances:5,goals:1,assists:4,average_rating:null},
 {latest_name:'Bravo',appearances:2,goals:2,assists:2,average_rating:9.2},
];
const names=()=>Array.from(sort(players),player=>player.latest_name).join(',');
assert.equal(names(),'Alpha,Bravo,Zulu','appearances default to descending');
state.key='goals';state.direction='desc';assert.equal(names(),'Zulu,Bravo,Alpha');
state.direction='asc';assert.equal(names(),'Alpha,Bravo,Zulu');
state.key='assists';state.direction='desc';assert.equal(names(),'Alpha,Bravo,Zulu');
state.key='latest_name';state.direction='asc';assert.equal(names(),'Alpha,Bravo,Zulu');
state.direction='desc';assert.equal(names(),'Zulu,Bravo,Alpha');
state.key='average_rating';state.direction='desc';assert.equal(names(),'Bravo,Zulu,Alpha','unrated players remain last');
state.direction='asc';assert.equal(names(),'Zulu,Bravo,Alpha','unrated players remain last in both directions');
console.log('PASS Sandy Bums sorting: every tracked column, both directions, unrated last.');
