import test from 'node:test';
import assert from 'node:assert/strict';
import {testClub,mergeTestMatches,testOpponents} from '../league-ea-test-model.js';
test('test clubs require a numeric ID and a real display name',()=>{
 assert.deepEqual(testClub(' Roma ',' 123 '),{name:'Roma',id:'123'});
 for(const id of ['../1','1?x=2','abc',''])assert.throws(()=>testClub('Roma',id));
});
test('archives deduplicate and reject unrelated or malformed matches',()=>{
 const g={matchId:'42',timestamp:100,clubs:{'1':{},'2':{}}};
 assert.equal(mergeTestMatches([g],[{...g,timestamp:101},{...g,matchId:'43',clubs:{'2':{}}},{...g,matchId:null}],'1').length,1);
 assert.equal(mergeTestMatches([g],[{...g,timestamp:101}],'1')[0].timestamp,101);
 assert.equal(testOpponents(g,['1','2']),true);assert.equal(testOpponents(g,['1','3']),false);
 assert.equal(mergeTestMatches([],Array.from({length:110},(_,i)=>({...g,matchId:String(i)})),'1').length,100);
});
