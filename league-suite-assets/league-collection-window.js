export function collectionWindow(draft,fixture){
 const night=draft.fixtures.filter(f=>f.date===fixture.date),start=Math.min(...night.map(f=>Number(f.startsAt)));
 return {from:start-15*60000,to:start+90*60000};
}
export function activeCollectionFixtures(draft,now=Date.now()){return draft.fixtures.filter(f=>{const w=collectionWindow(draft,f);return now>=w.from&&now<=w.to;});}
