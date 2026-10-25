import test from 'node:test';import assert from 'node:assert/strict';
import {collectLeagues} from '../functions/_lib/league-collector.js';import {collectionPlan} from '../league-collection-policy.js';
import {buildLeagueSchedule} from '../league-engine.js';import {eaTrialSettings} from '../league-ea-trial.js';
function database(){let saved={settings:eaTrialSettings(),acceptedResults:[]},health={},updates=[],runs=[];
 return {updates,runs,get health(){return health;},DB:{prepare(sql){return{bind(...args){this.args=args;return this;},async all(){return{results:sql.includes('enabled=1')?[{id:'trial',revision:1,draft_json:JSON.stringify(saved),health:JSON.stringify(health)}]:[]};},async run(){if(sql.startsWith('INSERT INTO preview_collection_runs'))runs.push(this.args);if(sql.startsWith('UPDATE preview_league_results SET draft_json')){updates.push(this.args);saved=JSON.parse(this.args[0]);health=JSON.parse(this.args[2]);}return{meta:{changes:1}};}};}}};
}
test('required friendly failure is durable across idle ticks and idle never claims a successful EA check',async()=>{
 const d=buildLeagueSchedule(eaTrialSettings()),start=d.fixtures[0].startsAt,db=database();
 await collectLeagues({DB:db.DB},{now:start,readFeed:async(id,type)=>({type,available:type!=='friendly',matches:[],attempts:type==='friendly'?['EA direct: HTTP 403']:[]})});
 assert.equal(db.health.upstreamStatus,'failed');assert.equal(db.health.lastEAsuccess,null);assert.equal(db.updates[0][1],0);assert.equal(db.runs[0][4],'feed-failure');
 const failure=db.health.lastFeedFailure;
 await collectLeagues({DB:db.DB},{now:start+95*60000,readFeed:()=>{throw Error('Should be idle');}});
 assert.deepEqual(db.health.lastFeedFailure,failure);assert.equal(db.health.upstreamStatus,'failed');assert.match(db.health.warnings.join(' '),/do not clear/);assert.equal(db.updates[1][1],0);
});
test('missed games get bounded 30-minute catch-up retries for seven days and all clubs are checked',async()=>{
 const draft=buildLeagueSchedule(eaTrialSettings()),start=draft.fixtures[0].startsAt,now=start+2*86400000,db=database();let calls=0;
 const readFeed=async(id,type)=>{calls++;return{type,available:true,matches:[],attempts:[]};};
 assert.equal(collectionPlan(draft,{},start-16*60000).mode,'idle');
 await collectLeagues({DB:db.DB},{now,readFeed});assert.equal(calls,30);assert.equal(db.health.mode,'catchup');assert.equal(db.health.lastEAsuccess,new Date(now).toISOString());assert.equal(db.updates[0][1],1);
 assert.equal(collectionPlan(draft,db.health,now+29*60000).mode,'idle');assert.equal(collectionPlan(draft,db.health,now+30*60000).mode,'catchup');assert.equal(collectionPlan(draft,{},start+8*86400000).mode,'idle');
});
test('format-scoped collectors do not fetch or write the other league',async()=>{const db=database();await collectLeagues({DB:db.DB,LEAGUE_FORMAT:'10v10'},{readFeed:()=>{throw Error('Wrong league');}});assert.equal(db.updates.length,0);assert.equal(db.runs.length,0);});
