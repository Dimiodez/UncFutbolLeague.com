import assert from 'node:assert/strict';
import {buildLeagueSchedule,validateScheduleSettings} from '../league-engine.js';
const base={format:'6v6',season:'Test',league:'Test',weekday:4,secondWeekday:2,matchnightCount:2,startDate:'2026-10-15',time:'20:00',timeZone:'America/Chicago',spacingMinutes:30,byePolicy:'fullNight'};
const teams=count=>Array.from({length:count},(_,i)=>({id:`team-${i+1}`,name:`Team ${i+1}`}));
const schedule=buildLeagueSchedule({...base,teams:teams(9)});
assert.deepEqual(schedule.nights.slice(0,5).map(n=>n.date),['2026-10-15','2026-10-20','2026-10-22','2026-10-27','2026-10-29']);
for(const count of [5,7,9,11,39]){
 const s=buildLeagueSchedule({...base,teams:teams(count)});
 assert.equal(s.nights.length,count);assert.equal(s.fixtures.length,count*(count-1));
 for(const night of s.nights){assert.equal(night.byes.length,1);for(const team of s.settings.teams){const games=night.fixtures.filter(f=>f.home.id===team.id||f.away.id===team.id);assert([0,2].includes(games.length));}}
 assert.deepEqual(buildLeagueSchedule(JSON.parse(JSON.stringify(s.settings))).fixtures,s.fixtures);
}
const paused=buildLeagueSchedule({...base,teams:teams(9),breaks:[{from:'2026-10-20',to:'2026-10-22',reason:'Holiday'}]});
assert.deepEqual(paused.skippedDates.map(n=>n.date),['2026-10-20','2026-10-22']);
assert.deepEqual(paused.nights.slice(0,3).map(n=>n.date),['2026-10-15','2026-10-27','2026-10-29']);
const fortnight=buildLeagueSchedule({...base,repeatWeeks:2,teams:teams(9)});
assert.deepEqual(fortnight.nights.slice(0,5).map(n=>n.date),['2026-10-15','2026-10-27','2026-10-29','2026-11-10','2026-11-12']);
const legacy=buildLeagueSchedule({...base,matchnightCount:undefined,repeatWeeks:2,teams:teams(9)});
assert.deepEqual(legacy.nights.slice(0,3).map(n=>n.date),['2026-10-15','2026-10-29','2026-11-12']);
assert.equal(legacy.settings.matchnightCount,1);
const sunday=buildLeagueSchedule({...base,weekday:0,secondWeekday:2,startDate:'2026-10-18',teams:teams(5)});
assert.deepEqual(sunday.nights.slice(0,3).map(n=>n.date),['2026-10-18','2026-10-20','2026-10-25']);
const dst=buildLeagueSchedule({...base,startDate:'2026-10-29',teams:teams(5)});
const dates=dst.nights.slice(0,2).map(n=>new Date(n.fixtures[0].startsAt).toISOString());
assert.deepEqual(dates,['2026-10-30T01:00:00.000Z','2026-11-04T02:00:00.000Z']);
for(const secondWeekday of [4,undefined,null,'',7,-1])assert.throws(()=>validateScheduleSettings({...base,secondWeekday}),/different matchnights/);
assert.throws(()=>validateScheduleSettings({...base,matchnightCount:3}),/one or two/);
console.log('PASS: twice-weekly dates, legacy recurrence, full-night byes, breaks, alternate active weeks, Sunday, DST, validation and saved-settings round trip.');
