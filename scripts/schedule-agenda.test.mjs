import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {workshopMatchdays} from '../league-suite-assets/league-match-management.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function publicContext(){const app=read('app.js'),context=vm.createContext({window:{},URLSearchParams,console});vm.runInContext(read('pickems-app/season-data.js'),context);vm.runInContext(app.slice(0,app.indexOf('function homePage()'))+read('league-season2.js')+read('player-portraits.js')+read('league-pages.js')+app.slice(app.indexOf('function defaultScheduleWeek('),app.indexOf('function communityEventsPage(')),context);return context;}
test('public schedules keep all matchdays in collapsible groups with dated shortcuts in both divisions',()=>{
 for(const division of ['6v6','10v10']){const c=publicContext();c.division=division;const html=vm.runInContext("schedulesPage(new URLSearchParams('season=2&type='+division+'&matchday=all'))",c),season=JSON.parse(read('pickems-app/seasons/s2-'+division+'.json'));
 assert.equal((html.match(/<details class="schedule-week"/g)||[]).length,season.weeks.length);
 assert.equal((html.match(/data-schedule-jump=/g)||[]).length,season.weeks.length);
 assert(!/<details class="schedule-week"[^>]*\bopen\b/.test(html));assert(html.includes('Missing results ('));assert(html.includes('Current / next matchday'));
 for(const week of season.weeks)assert(html.includes('id="matchday-'+week.week+'"'));
 }
});
test('a public missing-results filter includes overdue and review fixtures, excludes completed scores and future starts',()=>{
 const c=publicContext();c.matches=[[1,'A','B',0,0,1],[2,'A','B',null,null,1],[3,'A','B',null,null,9999999999],[4,'A','B',null,null,9999999999]];
 assert.equal(vm.runInContext("scheduleMatchState(matches[0],{},10000000)",c),'played');
 assert.equal(vm.runInContext("scheduleMatchState(matches[1],{},10000000)",c),'missing');
 assert.equal(vm.runInContext("scheduleMatchState(matches[2],{},10000000)",c),'upcoming');
 assert.equal(vm.runInContext("scheduleMatchState(matches[3],{resultOverrides:{4:{kind:'review'}}},10000000)",c),'missing');
});
test('workshop date grouping classifies review and overdue results without mutating accepted corrections or fixtures',()=>{
 const team=id=>({id,name:id}),fixture=(id,date,startsAt)=>({id,date,startsAt,home:team('A'),away:team('B')});
 const draft={settings:{timeZone:'America/Chicago'},fixtures:[fixture('future','2026-11-19',20000000),fixture('done','2026-11-05',1000),fixture('missing','2026-11-05',2000),fixture('review','2026-11-05',3000)],acceptedResults:[{fixtureId:'done',homeScore:1,awayScore:0,correction:{reason:'Protected forfeit'}}],pendingResults:[{fixtureId:'review',candidates:[]}]},before=JSON.stringify(draft),groups=workshopMatchdays(draft,10000000);
 assert.equal(groups.length,2);assert.equal(groups[0].date,'2026-11-05');assert.equal(groups[0].played,1);assert.equal(groups[0].missing,1);assert.equal(groups[0].review,1);assert.equal(groups[1].upcoming,1);assert.equal(JSON.stringify(draft),before);
 assert.equal(groups.flatMap(g=>g.fixtures).length,4);
});
