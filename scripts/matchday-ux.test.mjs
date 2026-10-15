import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function uxContext(){
 const values=new Map(),destinations=[];
 const location={pathname:'/account',search:'',href:'https://www.uncfutbolleague.com/account',replace:path=>destinations.push(path)};
 const context=vm.createContext({window:{},location,URL,URLSearchParams,Date,sessionStorage:{setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k),removeItem:k=>values.delete(k)}});
 vm.runInContext(read('navigation-ux.js'),context);return {ux:context.window.UFLUX,location,values,destinations};
}
test('login returns are limited to safe internal member destinations',()=>{
 const {ux}=uxContext();
 for(const path of ['/team-hub?team=6v6%3AARS','/pickems?division=10v10','/coaching','/arcade'])assert.equal(ux.safeReturn(path),path);
 for(const path of ['https://evil.example','//evil.example','/\\evil.example','/api/auth/logout','/admin','/team-hub/../api/auth/logout','/team-hub\n','/%2f%2fevil.example'])assert.equal(ux.safeReturn(path),null);
});
test('successful sign-in returns to the selected team without retaining the destination',()=>{
 const {ux,location,values,destinations}=uxContext();
 ux.rememberReturn('/team-hub?team=6v6%3AARS');
 location.search='?login=success';
 assert.equal(ux.completeLoginReturn({authenticated:false}),false);
 assert.equal(ux.completeLoginReturn({authenticated:true}),true);
 assert.deepEqual(destinations,['/team-hub?team=6v6%3AARS']);
 assert.equal(values.size,0);
});
test('stale saved destinations do not redirect a later login',()=>{
 const {ux,location,values,destinations}=uxContext();
 values.set('ufl-login-return',JSON.stringify({path:'/team-hub',at:Date.now()-1800001}));location.search='?login=success';
 assert.equal(ux.completeLoginReturn({authenticated:true}),false);assert.equal(destinations.length,0);
});
test('schedules default to the next or in-progress matchday, not the first stale unplayed week',()=>{
 const source=read('app.js'),start=source.indexOf('function defaultScheduleWeek('),end=source.indexOf('function schedulesPage(',start);
 const context=vm.createContext({Date});vm.runInContext(source.slice(start,end),context);
 const weeks=[{week:1,scheduledAt:1000},{week:2,scheduledAt:10000},{week:3,scheduledAt:20000}];context.weeks=weeks;
 assert.equal(vm.runInContext('defaultScheduleWeek(weeks,9000000).week',context),2);
 assert.equal(vm.runInContext('defaultScheduleWeek(weeks,999999999).week',context),3);
 assert.equal(vm.runInContext('defaultScheduleWeek([],Date.now())',context),null);
});
test('priority UX resources are published and preserve security boundaries',()=>{
 const html=read('index.html'),hub=read('team-hub.html'),app=read('app.js');
 assert.match(html,/navigation-ux\.js/);assert.match(html,/matchday-ux\.css/);
 assert.ok(app.indexOf('This week in UFL')<app.indexOf('featuredClubSection()}'));
 assert.match(app,/schedule-mobile-matches/);assert.match(app,/schedule-desktop-table/);
 assert.match(app,/name="team"/);assert.match(app,/Whole season/);assert.match(app,/Jump to today/);
 assert.match(hub,/class="site-header"/);assert.match(hub,/data-standalone-navigation="true"/);
 assert.doesNotMatch(read('team-hub.js'),/I’m signed in — open hub/);
 assert.match(read('functions/api/auth/discord.js'),/verifyTurnstile/);
 assert.match(read('functions/api/auth/callback.js'),/verifyLoginState/);
});

test('Pick’ems has a compact matchday selector and visible deadline and progress near the ballot',()=>{
 const app=read('pickems-app/app.js'),html=read('pickems-app/index.html');
 assert.match(app,/id="pickem-matchday"/);assert.match(app,/Date\.now\(\)>=week\.scheduledAt/);
 assert.ok(html.indexOf('id="ballot-deadline"')<html.indexOf('id="simple-fixtures"'));
 assert.ok(html.indexOf('id="progress-top"')<html.indexOf('id="simple-fixtures"'));
 assert.match(app,/rememberDraft\(\);window\.top\.location\.assign\(loginDestination\(\)\)/);
});
test('only bounded, current match predictions survive the login handoff',()=>{
 const source=read('pickems-app/app.js'),start=source.indexOf('function readDraft('),end=source.indexOf('function showToast(',start),values=new Map();
 const context=vm.createContext({state:{competition:'s2-6v6'},Date,serverBallots:new Map(),fixturesForWeek:()=>[{id:'1'},{id:'2'}],sessionStorage:{getItem:k=>values.get(k)},URLSearchParams});
 vm.runInContext("const ballotKey=(competition,week)=>competition+':'+week;\n"+source.slice(start,end),context);
 values.set('ufl-pickem-draft:s2-6v6:1',JSON.stringify({at:Date.now(),picks:{1:'home',2:'bogus',99:'away'},tiebreaker:300}));
 const draft=vm.runInContext('readDraft(1)',context);assert.equal(JSON.stringify(draft.picks),'{"1":"home"}');assert.equal(draft.tiebreaker,'');
 values.set('ufl-pickem-draft:s2-6v6:1',JSON.stringify({at:Date.now()-86400001,picks:{1:'home'}}));
 assert.equal(vm.runInContext('readDraft(1)',context),null);
});
test('invite approval and the UFL navigation identity are retained',()=>{
 const app=read('app.js'),html=read('index.html');
 assert.match(app,/Invites are reviewed/);assert.match(app,/data-copy-discord="dimio11"/);
 assert.match(app,/six human outfield players/);assert.doesNotMatch(app,/fixtures arriving soon|prepare for account-based/);
 for(const name of ['Utility','Fun','League'])assert.ok(html.includes('aria-label="'+name+'"'));
 assert.equal((html.match(/href="\/coaching" data-link/g)||[]).length,2);
});
