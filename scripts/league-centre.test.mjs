import test from 'node:test';
import assert from 'node:assert/strict';
import {projectLeague,leagueCentreApi} from '../functions/_lib/league-centre.js';
import {buildLeagueSchedule} from '../league-suite-runtime/league-engine.js';
import {leagueStandings,acceptedAppearances} from '../league-suite-runtime/league-results.js';
import {playerTotals} from '../league-suite-runtime/league-player-stats.js';
import {eaTenTrialSettings} from '../league-suite-runtime/league-ea-ten-trial.js';
import {eaTrialSettings} from '../league-suite-runtime/league-ea-trial.js';
import {onRequest as suiteApi} from '../functions/api/league-suite/[[path]].js';
import {onRequest as suitePage} from '../functions/league-suite/[[path]].js';
import {onRequest as suiteAsset} from '../functions/league-suite-assets/[[path]].js';

function sample(){
 const draft=buildLeagueSchedule(eaTenTrialSettings()),[f,,other]=draft.fixtures;
 const p={playerId:'player-1',name:'Saved EA player',teamId:f.home.id,teamName:f.home.name,position:'MID',rating:8,goals:2,assists:1,details:{shots:4,passes:10,passesCompleted:8,tackles:3,tacklesWon:2,manOfTheMatch:1}};
 draft.acceptedResults=[{fixtureId:f.id,matchId:'saved-ea-1',timestamp:f.startsAt,homeScore:2,awayScore:1,finish:'standard',appearances:[p],correction:{reason:'Correct a disconnect score',actor:'PRIVATE-STAFF-ID',at:'2026-10-20',statsReview:false},eaOriginal:{homeScore:3,awayScore:0}},{fixtureId:other.id,matchId:'saved-ea-2',timestamp:other.startsAt,homeScore:0,awayScore:0,finish:'standard',appearances:[{...p,teamId:other.home.id,teamName:other.home.name,rating:3,goals:0,assists:null,details:{}}]}];
 draft.pendingResults=[{fixtureId:draft.fixtures[1].id,matchId:'PRIVATE-CANDIDATE',homeScore:99,awayScore:0,appearances:[{...p,name:'DO NOT COUNT ME',goals:99}],games:[{private:'candidate evidence'}]}];
 return {id:'test-ten',revision:7,enabled:1,checked_at:'2026-10-28 03:25:38',succeeded_at:'2026-10-28 03:20:00',draft};
}
test('display calculates standings and totals from saved accepted EA results and preserves staff corrections',()=>{
 const row=sample(),before=structuredClone(row),view=projectLeague(row,{now:Date.parse('2026-10-21T00:00Z')});
 const reference=leagueStandings(row.draft);
 assert.deepEqual(view.standings.map(t=>[t.id,t.played,t.points,t.goalsFor,t.goalsAgainst]),reference.map(t=>[t.id,t.played,t.points,t.goalsFor,t.goalsAgainst]));
 assert.deepEqual(view.players.map(p=>[p.playerId,p.teamId,p.apps,p.rating,p.goals]),playerTotals(acceptedAppearances(row.draft)).map(p=>[p.playerId,p.teamId,p.apps,p.averageRating,p.totals.goals]));
 assert.equal(view.fixtures[0].homeScore,2);assert.equal(view.fixtures[0].source,'reviewed-ea');assert.equal(view.totals.played,2);assert.equal(view.totals.goals,3);
 assert.deepEqual(row,before,'Rendering must never write or normalize stored results');
});
test('pending candidates reveal status only and cannot affect standings or player totals',()=>{
 const view=projectLeague(sample()),pending=view.fixtures.find(f=>f.status==='review');
 assert(pending);assert.equal(view.totals.pending,1);assert.equal(pending.homeScore,undefined);assert.equal(pending.appearances,undefined);
 assert.equal(view.players.some(p=>p.name==='DO NOT COUNT ME'),false);
 const body=JSON.stringify(view);for(const secret of ['PRIVATE-CANDIDATE','PRIVATE-STAFF-ID','candidate evidence','eaClubId','eaOriginal'])assert(!body.includes(secret),secret);
});
test('missing metrics and disconnect ratings stay unavailable and player totals stay separate by team and league',()=>{
 const view=projectLeague(sample()),unknown=view.players.find(p=>p.rating===null);
 assert(unknown);assert.equal(unknown.ratingCount,0);assert.equal(unknown.assists,null);assert.equal(unknown.shots,null);assert.equal(unknown.passAccuracy,null);
 assert.equal(view.players.filter(p=>p.playerId==='player-1').length,2,'Same player at two clubs remains two entries');
 const six=projectLeague({id:'six',draft:{...buildLeagueSchedule(eaTrialSettings()),acceptedResults:[]}});
 assert.equal(six.teams.length,10);assert.equal(six.players.length,0);assert(six.standings.every(t=>t.points===0));
});
test('historical score-only fallback contributes points while explicitly marking player statistics unavailable',()=>{
 const row=sample();row.draft.acceptedResults[0]={...row.draft.acceptedResults[0],appearances:[],provenance:{kind:'va-score-only'}};
 const view=projectLeague(row);assert.equal(view.sourceCounts['va-score'],1);assert.equal(view.fixtures[0].source,'va-score');assert.equal(view.fixtures[0].statsStatus,'unavailable');assert.equal(view.fixtures[0].appearances.length,0);assert.equal(view.totals.played,2);
});
test('display API only reads the scoped test database and rejects mutation methods',async()=>{
 let reads=0;const env={DB:{prepare(sql){assert.match(sql,/FROM preview_league_results/);return {async all(){reads++;return {results:[sample()]};}};}}};
 for(const method of ['POST','PUT','DELETE','PATCH'])assert.equal((await leagueCentreApi(new Request('https://ufl.test/display',{method}),env)).status,405);
 assert.equal(reads,0);const response=await leagueCentreApi(new Request('https://ufl.test/display'),env);
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private, no-store/);assert.equal((await response.json()).leagues.length,1);assert.equal(reads,1);
 assert.equal((await leagueCentreApi(new Request('https://ufl.test/display'),{DB:{prepare(){throw Error('Unavailable');}}})).status,503);
});
test('new centre page and data retain server-side owner/admin gates, including direct asset URLs',async()=>{
 const request=path=>new Request('https://ufl.test'+path,{headers:{cookie:'__Host-ufl_session=unit-test'}});
 const env=(role,enabled)=>({DB:{prepare(){return {bind(){return this;},async first(){return {discord_id:'123',role,status:'active',admins_enabled:enabled};}};}},LEAGUE_SUITE_DB:{prepare(){return {async all(){return {results:[sample()]};}};}},ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname)}});
 for(const role of ['member','manager','admin']){
  const e=env(role,0);assert.equal((await suitePage({request:request('/league-suite/view'),env:e})).status,403);assert.equal((await suiteApi({request:request('/api/league-suite/display'),env:e})).status,403);assert.equal((await suiteAsset({request:request('/league-suite-assets/league-centre'),env:e,next(){throw Error('Private asset leaked');}})).status,403);
 }
 for(const role of ['owner','admin']){const e=env(role,1),page=await suitePage({request:request('/league-suite/view'),env:e}),api=await suiteApi({request:request('/api/league-suite/display'),env:e});assert.equal(page.status,200);assert.equal(await page.text(),'/league-suite-assets/league-centre');assert.equal(api.status,200);assert.match(api.headers.get('cache-control'),/no-store/);assert.equal((await api.json()).leagues[0].id,'test-ten');}
});
