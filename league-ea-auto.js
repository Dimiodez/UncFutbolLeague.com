import {fixtureCandidates} from './league-engine.js?v=20261014-trial1';
import {acceptFixtureResult} from './league-results.js?v=20261016-suite1';
import {applyConfirmedTrialCorrection,needsResultReview} from './league-result-corrections.js';
export function importAutomaticTrial(draft,games,now=Date.now()){
 if(!draft.settings.trialSchedule&&!draft.settings.collectionEnabled)throw Error('Enable shared collection for this preview league first.');
 let next=draft,added=0,updated=0;const warnings=[];
 for(const saved of draft.acceptedResults||[]){if(saved.correction)continue;const game=games.find(g=>String(g.matchId??g.id)===saved.matchId);if(!game)continue;try{const base={...next,acceptedResults:next.acceptedResults.filter(r=>r.fixtureId!==saved.fixtureId)},verified=acceptFixtureResult(base,saved.fixtureId,game,saved.finish).acceptedResults.at(-1);if(verified.homeScore!==saved.homeScore||verified.awayScore!==saved.awayScore){warnings.push('Saved score differs from EA; left unchanged for review.');continue;}if(verified.appearances.length&&JSON.stringify(verified.appearances)!==JSON.stringify(saved.appearances)){next={...next,acceptedResults:next.acceptedResults.map(r=>r.fixtureId===saved.fixtureId?{...r,appearances:verified.appearances}:r)};updated++;}}catch{warnings.push('Existing result could not be enriched safely; left unchanged.');}}
 for(const fixture of draft.fixtures){
  if(fixture.startsAt>now||!fixture.home.eaClubId||!fixture.away.eaClubId||(next.acceptedResults||[]).some(r=>r.fixtureId===fixture.id))continue;
  const found=fixtureCandidates(fixture,games,{timeZone:draft.settings.timeZone,acceptedMatchIds:(next.acceptedResults||[]).map(r=>r.matchId)});
  if(found.candidates.length>1){warnings.push(`${fixture.home.name} vs ${fixture.away.name}: multiple EA games; not guessed.`);continue;}
  if(found.candidates.length!==1)continue;
  if(needsResultReview(found.candidates[0])&&String(found.candidates[0].matchId)!=='106222996430420'){warnings.push(`${fixture.home.name} vs ${fixture.away.name}: quit/3–0 result requires review; not auto-counted.`);continue;}
  try{next=acceptFixtureResult(next,fixture.id,found.candidates[0],'pending');added++;}catch(e){warnings.push(`${fixture.home.name} vs ${fixture.away.name}: ${e.message}`);}
 }
 const corrected=applyConfirmedTrialCorrection(next);if(corrected!==next)updated++;return {draft:corrected,added,updated,warnings};
}
