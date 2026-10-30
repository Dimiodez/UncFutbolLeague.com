import {clubPlayers,numeric} from './league-player-stats.js';
function durationEvidence(game){
 const clubs=Object.keys(game.clubs||{});if(clubs.length!==2)return 'unknown';
 const sides=clubs.map(id=>clubPlayers(game,id).filter(([,p])=>String(p?.playername??p?.name??'').trim()).map(([,p])=>numeric(p.gameTime)));
 if(sides.some(values=>!values.length||values.some(v=>v===null||v<=0)))return 'unknown';
 if(sides.every(values=>Math.max(...values)>=5400))return 'completed';
 if(sides.every(values=>Math.max(...values)<5400))return 'short';
 return 'unknown';
}
export function automaticCandidates(candidates){
 if(candidates.length<=1)return candidates;
 const evidence=candidates.map(game=>({game,duration:durationEvidence(game)})),complete=evidence.filter(e=>e.duration==='completed');
 // Only resolve retries when both sides have a full-length record and every
 // alternative is demonstrably short. Unknown/two complete games stay reviewable.
 return complete.length===1&&evidence.every(e=>e===complete[0]||e.duration==='short')?[complete[0].game]:candidates;
}
