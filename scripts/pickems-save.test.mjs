import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../pickems-app/app.js',import.meta.url),'utf8');
function context(fetch){
 const elements=new Map([['#save-simple',{disabled:false,textContent:'Save shared ballot'}],['#save-status',{textContent:'',dataset:{}}],['#tiebreaker',{value:'4'}]]),ballots=new Map();
 const selected=[{dataset:{match:'101',choice:'home'}},{dataset:{match:'102',choice:'draw'}}];
 const state={competition:'s2-6v6',simpleWeek:1};
 const c=vm.createContext({authState:{authenticated:true},state,serverBallots:ballots,sessionStorage:{removeItem(){}},ballotKey:(c,w)=>c+':'+w,$:key=>elements.get(key),$$:()=>selected,fixturesForWeek:()=>[{id:'101'},{id:'102'}],weekData:()=>({scheduledAt:Date.now()/1000+3600}),showToast(){},fetch,loadLeaderboard:async()=>{}});
 const start=source.indexOf('function showSaveStatus('),end=source.indexOf('function renderSimple()',start);
 vm.runInContext(source.slice(start,end),c);
 return {c,elements,ballots,selected,state,save:()=>vm.runInContext('saveSimpleBallot()',c)};
}
test('signed-in save sends every selection and confirms success beside the button',async()=>{
 let sent;const c=context(async(url,options)=>{sent=JSON.parse(options.body);return Response.json({ok:true});});
 await c.save();assert.deepEqual(sent,{competition:'s2-6v6',week:1,picks:{101:'home',102:'draw'},tiebreaker:4});
 assert.equal(c.elements.get('#save-status').dataset.state,'saved');assert.match(c.elements.get('#save-status').textContent,/Saved to your UFL account/);
 assert.equal(c.ballots.get('s2-6v6:1').tiebreaker,4);assert.equal(c.elements.get('#save-simple').disabled,false);
});
test('server rejection is visible and cannot be mistaken for a saved ballot',async()=>{
 const c=context(async()=>Response.json({error:'Submit one valid pick for every open match.'},{status:400}));
 await c.save();assert.match(c.elements.get('#save-status').textContent,/Submit one valid pick/);assert.equal(c.ballots.size,0);assert.equal(c.elements.get('#save-simple').disabled,false);
});
test('network failure and invalid ballot show actionable feedback, retaining selections',async()=>{
 const c=context(async()=>{throw Error('offline')});await c.save();
 assert.match(c.elements.get('#save-status').textContent,/Nothing was confirmed saved/);assert.equal(c.selected.length,2);
 c.selected.pop();await c.save();assert.match(c.elements.get('#save-status').textContent,/all 2 matches/);
});
test('in-flight save cannot attach a ballot to another matchday',async()=>{
 let finish;const c=context(()=>new Promise(resolve=>finish=resolve));const saving=c.save();c.state.simpleWeek=2;finish(Response.json({ok:true}));await saving;
 assert.equal(c.ballots.has('s2-6v6:1'),true);assert.equal(c.ballots.has('s2-6v6:2'),false);
});
test('login draft capture iterates over every selected button',()=>{
 const selected=[{dataset:{match:'1',choice:'home'}},{dataset:{match:'2',choice:'away'}}];let saved;
 const c=vm.createContext({state:{competition:'s2-6v6',simpleWeek:1},Date,ballotKey:(c,w)=>c+':'+w,$:()=>({value:'4'}),$$:()=>selected,sessionStorage:{setItem:(key,value)=>saved=JSON.parse(value)}});
 vm.runInContext(source.slice(source.indexOf('function rememberDraft()'),source.indexOf('function loginDestination()'))+'\nrememberDraft();',c);
 assert.deepEqual(saved.picks,{'1':'home','2':'away'});
});
