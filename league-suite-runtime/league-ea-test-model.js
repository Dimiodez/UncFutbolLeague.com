export function testClub(name,id){
 name=String(name||'').trim();id=String(id||'').trim();
 if(name.length<2||name.length>80||!/^\d{1,20}$/.test(id))throw Error('Enter a team name and numeric EA club ID.');
 return {name,id};
}
export function mergeTestMatches(previous,incoming,clubId){
 const games=new Map();
 for(const game of [...previous,...incoming]){
  if(!game||!/^\d{1,30}$/.test(String(game.matchId))||!Number.isFinite(Number(game.timestamp))||!game.clubs?.[clubId])continue;
  games.set(String(game.matchId),game);
 }
 return [...games.values()].sort((a,b)=>Number(b.timestamp)-Number(a.timestamp)).slice(0,100);
}
export function testOpponents(game,ids){return Object.keys(game.clubs||{}).length===2&&Object.keys(game.clubs).every(id=>ids.includes(id));}
