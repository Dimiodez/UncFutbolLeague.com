import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {workspaceId,workspaceLocation,workspaceUrl} from '../league-suite-assets/workspace-location.js';
import {suiteAccessPage} from '../functions/_lib/league-suite-access.js';
import {onRequest as pageMiddleware} from '../functions/_middleware.js';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('workspace URLs identify leagues independently of array position and safely restore sections',()=>{
 const a={settings:{season:'S2',league:'My league'}},b={settings:{trialSchedule:'ufl-6v6-20261015'}};
 const href=workspaceUrl('/league-suite?workspace=1',a.settings,'matches');
 assert.equal(workspaceLocation(href,[b,a],['overview','matches']).index,1);
 assert.equal(workspaceLocation(href,[a,b],['overview','matches']).tab,'matches');
 assert.equal(workspaceLocation('/league-suite?league=missing&section=__proto__',[a],['overview']).index,null);
 const renamed={...a.settings,workspaceId:workspaceId(a.settings),league:'Renamed'};assert.equal(workspaceId(renamed),workspaceId(a.settings));
 assert.equal(workspaceUrl(href,null),'/league-suite?workspace=1');
 assert.equal(read('league-suite-assets/workspace-location.js'),read('league-suite-runtime/workspace-location.js'));
});
test('access recovery retains the complete public header, denial status and safe return destination',async()=>{
 const env={ASSETS:{fetch:async()=>new Response(read('index.html'))}};
 for(const user of [null,{role:'member'},{role:'admin'}]){
  const response=await suiteAccessPage({user},new Request('https://www.uncfutbolleague.com/league-suite/dashboard?league=test'),env),html=await response.text();
  assert.equal(response.status,user?403:401);assert.match(response.headers.get('cache-control'),/private, no-store/);assert.equal(response.headers.get('vary'),'Cookie');
  assert.match(html,/UFB bot documentation/);assert.match(html,/Back to Home/);assert.doesNotMatch(html,/src="\/app.js/);
  if(!user)assert.match(html,/returnTo=%2Fleague-suite%2Fdashboard%3Fleague%3Dtest/);
  else assert.match(html,/does not currently have League Suite access/);
 }
});
test('unknown page URLs receive 404 without intercepting known pages, assets, APIs or private routes',async()=>{
 const env={ASSETS:{fetch:async()=>new Response('public shell',{headers:{'content-type':'text/html'}})}};
 for(const path of ['/','/clubs/ARS','/coaching/example','/arcade/sandy-uppy','/api/auth/session','/league-suite/dashboard','/team-hub','/func-app/','/styles.css']){
  assert.equal(await pageMiddleware({request:new Request('https://example.com'+path),env,next:()=> 'untouched'}),'untouched',path);
 }
 assert.equal((await pageMiddleware({request:new Request('https://example.com/not-a-page'),env,next(){throw Error('unexpected fallback')}})).status,404);
});
test('display timezone is shared, validates stored preferences and handles DST without altering timestamps',()=>{
 let stored;const context=vm.createContext({window:{addEventListener(){}},localStorage:{getItem:()=>stored},Intl,Date});vm.runInContext(read('time-preference.js'),context);const time=context.window.UFLTime;
 const stamp=Date.parse('2026-10-23T02:00:00Z');assert.match(time.format(stamp),/10:00 PM/);
 stored='America/Chicago';assert.match(time.format(stamp),/9:00 PM/);assert.match(time.format(stamp),/CDT/);
 assert.match(time.format(Date.parse('2026-12-23T03:00:00Z')),/CST/);
 stored='invalid';assert.equal(time.zone(),'America/New_York');assert.equal(stamp,1792720800000);
});
test('FUNC draws current clubs from the public catalog while preserving historical ids and local export-safe artwork',()=>{
 const context=vm.createContext({window:{}});vm.runInContext(read('pickems-app/season-data.js')+'\n'+read('league-season2.js')+'\n'+read('func-catalog.js'),context);
 const catalog=context.window.UFLCardClubs,rows=catalog.options([['goth','UFL Gotham City'],['pal','UFL Palermo']]);
 assert(rows.some(([id,name])=>id.startsWith('s2:6v6:')&&name.includes('Arsenal')));assert(rows.some(([id,name])=>id==='pal'&&name.startsWith('Season 1')));
 assert.equal(new Set(rows.map(([id])=>id)).size,rows.length);assert.equal(catalog.crest('goth'),'./assets/func-teams/goth.png');
 for(const [id] of rows.filter(([id])=>id.startsWith('s2:')))assert.match(catalog.crest(id),/^\/assets\//);
});
test('Suite startup has retry recovery, role settings remain explicit, and navigation retains edit guards',()=>{
 assert.match(read('league-suite-assets/league-workshop-loader.js'),/catch[\s\S]*Reload workspace/);
 assert.match(read('league-suite-assets/league-workshop.js'),/beforeunload/);assert.match(read('league-suite-assets/league-page.js'),/hasUnsavedWorkspace/);
 assert.match(read('navigation-ux.js'),/el.inert=true/);assert.match(read('navigation-ux.js'),/event.shiftKey/);
 assert.match(read('league-suite-access.js'),/Only|access.owner/);assert.match(read('league-suite-access.js'),/workspace-advanced/);
});
