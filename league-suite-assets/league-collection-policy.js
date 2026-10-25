import {activeCollectionFixtures,collectionWindow} from './league-collection-window.js';
export function collectionPlan(draft,health={},now=Date.now()){
 const live=activeCollectionFixtures(draft,now),accepted=new Set((draft.acceptedResults||[]).map(r=>r.fixtureId));
 const missing=draft.fixtures.filter(f=>!accepted.has(f.id)&&f.startsAt<=now&&now-f.startsAt<=7*86400000&&now>collectionWindow(draft,f).to+15*60000);
 const last=Date.parse(health.lastCatchupCheck||'');
 const catchup=!live.length&&missing.length&&(!Number.isFinite(last)||now-last>=30*60000);
 return {mode:live.length?'live':catchup?'catchup':'idle',fixtures:live.length?live:catchup?missing:[],missingCount:missing.length};
}
