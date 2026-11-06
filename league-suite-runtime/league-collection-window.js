export function collectionWindow(draft,fixture){
 const night=draft.fixtures.filter(f=>f.date===fixture.date),start=Math.min(...night.map(f=>Number(f.startsAt))),last=Math.max(...night.map(f=>Number(f.startsAt)));
 return {from:start-15*60000,to:last+120*60000};
}
export function activeCollectionFixtures(draft,now=Date.now()){return draft.fixtures.filter(f=>{const w=collectionWindow(draft,f);return now>=w.from&&now<=w.to;});}
