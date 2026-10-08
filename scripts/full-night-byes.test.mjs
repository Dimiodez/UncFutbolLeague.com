import assert from 'node:assert/strict';
import {buildLeagueSchedule} from '../league-engine.js';
const base={format:'6v6',season:'Test',league:'Test',weekday:4,startDate:'2026-10-15',time:'20:00',timeZone:'America/Chicago',spacingMinutes:30,byePolicy:'fullNight'};
for(let count=5;count<40;count+=2){
 const teams=Array.from({length:count},(_,i)=>({id:`team-${i+1}`,name:`Team ${i+1}`}));
 const s=buildLeagueSchedule({...base,teams,breaks:[{from:'2026-10-22',to:'2026-10-22',reason:'Cup'}]});
 assert.equal(s.nights.length,count);assert.equal(s.fixtures.length,count*(count-1));assert.equal(s.skippedDates.length,1);
 for(const n of s.nights){assert.equal(n.byes.length,1);assert.equal(n.fixtures.length,count-1);
  for(const t of teams){const games=n.fixtures.filter(f=>[f.home.id,f.away.id].includes(t.id));assert([0,2].includes(games.length));if(games.length){assert.notEqual(games[0].startsAt,games[1].startsAt);assert.notEqual(games[0].home.id===t.id?games[0].away.id:games[0].home.id,games[1].home.id===t.id?games[1].away.id:games[1].home.id);}}
 }
 for(const t of teams){assert.equal(s.nights.filter(n=>n.byes.some(b=>b.id===t.id)).length,1);
  for(const other of teams.filter(o=>o!==t)){assert.equal(s.fixtures.filter(f=>f.home.id===t.id&&f.away.id===other.id).length,1);assert.equal(s.fixtures.filter(f=>f.away.id===t.id&&f.home.id===other.id).length,1);}}
}
assert.throws(()=>buildLeagueSchedule({...base,teams:Array.from({length:3},(_,i)=>({id:String(i),name:String(i)}))}),/at least 5/);
assert.throws(()=>buildLeagueSchedule({...base,byePolicy:'invalid',teams:[]}),/split byes/);
console.log('PASS: full-night byes for every odd team count 5–39, distinct opponents, clash-free slots, home/away balance, breaks and fixture totals.');
