import {fixtureCandidates} from './league-engine.js';
import {acceptFixtureResult} from './league-results.js';
import {correctFixture,needsResultReview} from './league-result-corrections.js';
export function stagePendingResults(draft,games,now=Date.now()){
 const pending=new Map((draft.pendingResults||[]).map(p=>[p.fixtureId,p]));
 for(const fixture of draft.fixtures){
  if((draft.acceptedResults||[]).some(r=>r.fixtureId===fixture.id)){pending.delete(fixture.id);continue;}
  if(fixture.startsAt>now||!fixture.home.eaClubId||!fixture.away.eaClubId)continue;
  const found=fixtureCandidates(fixture,games,{timeZone:draft.settings.timeZone,acceptedMatchIds:(draft.acceptedResults||[]).map(r=>r.matchId)}).candidates;
  if(!found.length||found.length===1&&!needsResultReview(found[0]))continue;
  const candidates=[];for(const game of found.slice(0,20)){try{const result=acceptFixtureResult(draft,fixture.id,game,'pending').acceptedResults.at(-1);candidates.push({...result,eaFlags:Object.fromEntries(Object.entries(game.clubs||{}).map(([id,c])=>[id,{winnerByDnf:c.winnerByDnf??null,result:c.result??null}]))});}catch{}}
  if(candidates.length)pending.set(fixture.id,{fixtureId:fixture.id,status:'needs-review',reason:found.length>1?'Multiple EA records: choose the completed official game.':'Possible quit/DC or 3–0 record: confirm the regulation score; EA may award a synthetic result.',firstSeenAt:pending.get(fixture.id)?.firstSeenAt||new Date(now).toISOString(),lastSeenAt:new Date(now).toISOString(),candidates});
 }
 return {...draft,pendingResults:[...pending.values()]};
}
export function acceptPendingResult(draft,fixtureId,matchId,values,options){
 if((draft.acceptedResults||[]).some(r=>r.fixtureId===fixtureId))throw Error('This fixture is already accepted. Refresh before reviewing it.');
 const candidate=draft.pendingResults?.find(p=>p.fixtureId===fixtureId)?.candidates.find(c=>c.matchId===String(matchId));if(!candidate)throw Error('Pending EA record is no longer available. Refresh the review list.');
 const corrected=correctFixture({...draft,acceptedResults:[...(draft.acceptedResults||[]),candidate]},fixtureId,values,options);
 return {...corrected,pendingResults:(draft.pendingResults||[]).filter(p=>p.fixtureId!==fixtureId)};
}
export function restorePendingResults(draft,pending=[]){
 if(!Array.isArray(pending)||pending.length>draft.fixtures.length)throw Error('Invalid pending review list.');
 const seen=new Set(),restored=[];
 for(const p of pending){if(!p||seen.has(p.fixtureId)||!draft.fixtures.some(f=>f.id===p.fixtureId)||!Array.isArray(p.candidates)||!p.candidates.length||p.candidates.length>20||typeof p.reason!=='string'||p.reason.length>500)throw Error('Invalid pending review record.');seen.add(p.fixtureId);if((draft.acceptedResults||[]).some(r=>r.fixtureId===p.fixtureId))continue;
  for(const c of p.candidates){if(typeof c.matchId!=='string'||c.matchId.length>100||!Number.isFinite(c.timestamp))throw Error('Invalid pending EA identity.');correctFixture({...draft,acceptedResults:[]},p.fixtureId,{...c,reason:'Validate saved pending record'});}
  restored.push(p);
 }
 return {...draft,pendingResults:restored};
}
