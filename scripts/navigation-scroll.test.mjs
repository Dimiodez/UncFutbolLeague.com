import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const renderSource=source.slice(source.indexOf('function render()'),source.indexOf('function randomLocation()'));
test('route renders restore the previous viewport after the DOM temporarily shrinks',()=>{
  const calls=[];
  const window={location:{pathname:'/schedules',search:'?season=2&type=6v6',hash:''},scrollX:0,scrollY:620,scrollTo(options){calls.push(options);this.scrollY=options.top;}};
  const main={set innerHTML(value){window.scrollY=0;},insertAdjacentHTML(){}};
  const document={body:{classList:{toggle(){}}},querySelector(selector){return selector==='main'?main:null;},querySelectorAll(){return [];}};
  const context=vm.createContext({window,document,URLSearchParams,URL,routes:{schedules:'/schedules'},schedulesPage:()=>'<div>Schedule</div>',
    bindDynamicActions(){},bindLeagueExplorer(){},hydrateAccount(){},hydratePublishedEvents(){},hydrateByotPage(){},renderAggregateByotBoard(){},hydrateUsersDirectory(){},hydrateHomeCalendar(){}});
  vm.runInContext(renderSource+'\nrender();',context);
  assert.equal(window.scrollY,620);
  assert.equal(calls[0].behavior,'instant');
  window.scrollY=340;
  window.location.search='?season=1&type=6v6';
  vm.runInContext('render();',context);
  assert.equal(window.scrollY,340);
});
