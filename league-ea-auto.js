import {fixtureCandidates} from './league-engine.js?v=20261014-trial1';
import {acceptFixtureResult} from './league-results.js?v=20261014-standard1';
export function importAutomaticTrial(draft,games,now=Date.now()){
 if(!draft.settings.trialSchedule)throw Error('Automatic import is restricted to the preview trial.');
 let next=draft,added=0;const warnings=[];
 for(const fixture of draft.fixtures){
  if(fixture.startsAt>now||!fixture.home.eaClubId||!fixture.away.eaClubId||(next.acceptedResults||[]).some(r=>r.fixtureId===fixture.id))continue;
  const found=fixtureCandidates(fixture,games,{timeZone:draft.settings.timeZone,acceptedMatchIds:(next.acceptedResults||[]).map(r=>r.matchId)});
  if(found.candidates.length>1){warnings.push(`${fixture.home.name} vs ${fixture.away.name}: multiple EA games; not guessed.`);continue;}
  if(found.candidates.length!==1)continue;
  try{next=acceptFixtureResult(next,fixture.id,found.candidates[0],'pending');added++;}catch(e){warnings.push(`${fixture.home.name} vs ${fixture.away.name}: ${e.message}`);}
 }
 return {draft:next,added,warnings};
}
