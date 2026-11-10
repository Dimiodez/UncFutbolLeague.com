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


test('sign-in returns to the same guide or arcade game and rejects unapproved destinations', () => {
  const navigation = fs.readFileSync(new URL('../navigation-ux.js', import.meta.url), 'utf8');
  const guide = '/coaching/8177fa01-9f5d-4ada-8df7-3fb22b8d0401';
  const game = '/arcade/sandy-uppy';
  const redirects = [];
  const session = new Map();
  const location = {pathname: '/account', search: '', replace: value => redirects.push(value)};
  const sessionStorage = {
    getItem: key => session.get(key) ?? null,
    setItem: (key, value) => session.set(key, value),
    removeItem: key => session.delete(key),
  };
  const context = vm.createContext({window: {}, URL, URLSearchParams, location, sessionStorage});
  vm.runInContext(navigation, context);
  const ux = context.window.UFLUX;

  for (const route of [guide, game]) {
    assert.equal(ux.rememberReturn(route), true);
    location.search = '?login=success';
    assert.equal(ux.completeLoginReturn({authenticated: true}), true);
    assert.equal(redirects.at(-1), route);
  }
  for (const route of ['//example.com/arcade', 'https://example.com/coaching', '/arcade/unlisted', '/api/auth/logout']) {
    assert.equal(ux.safeReturn(route), null);
  }
});
