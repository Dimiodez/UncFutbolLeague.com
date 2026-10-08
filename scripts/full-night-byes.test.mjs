import assert from 'node:assert/strict';
import {buildLeagueSchedule,upgradeDraftByePolicy} from '../league-engine.js';
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
const nine=Array.from({length:9},(_,i)=>({id:`team-${i+1}`,name:`team ${i+1}`}));
const old={...base,teams:nine,byePolicy:'split'};
const repaired=upgradeDraftByePolicy(old);assert.equal(repaired.byePolicy,'fullNight');
const repairedSchedule=buildLeagueSchedule(repaired);assert.equal(repairedSchedule.nights[0].byes[0].id,'team-1');assert.equal(repairedSchedule.nights[0].fixtures.filter(f=>[f.home.id,f.away.id].includes('team-1')).length,0);
assert.equal(repairedSchedule.nights[0].fixtures.filter(f=>[f.home.id,f.away.id].includes('team-8')).length,2);
assert.equal(upgradeDraftByePolicy(old,[{fixtureId:'fixture-1'}]).byePolicy,'split');
assert.equal(upgradeDraftByePolicy({...old,byePolicy:undefined},[{fixtureId:'fixture-1'}]).byePolicy,'split');
assert.equal(upgradeDraftByePolicy({...old,byePolicyRevision:2}).byePolicy,'fullNight');
assert.deepEqual(upgradeDraftByePolicy(repaired),repaired);
console.log('PASS: full-night byes for every odd team count 5–39, distinct opponents, clash-free slots, home/away balance, breaks and fixture totals.');
