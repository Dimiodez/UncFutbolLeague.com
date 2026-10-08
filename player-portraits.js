// Character portraits belong to players, never a league/team membership row.
// Keep only confirmed identity aliases here; never match fuzzy display names.
const leaguePlayerPortraits = [
  {playerIds:['1790183123676-110','1790179840025','1790040141524'],names:['DimiOdez','Odez'],src:'/assets/league/player-1790183123676-110-white-kit.png'},
  {playerIds:['1790642010611'],names:['DMellow'],src:'/assets/league/player-1790642010611-white-kit.png'}
];
function playerIdentityKey(player){
  const name=String(player.name||'').trim().toLowerCase();
  const identity=leaguePlayerPortraits.find(entry=>entry.playerIds.includes(String(player.id))||entry.names.some(alias=>alias.toLowerCase()===name));
  return identity?identity.names[0].toLowerCase():name||`id:${player.id}`;
}
function playerPortraitSource(player){
  const name=String(player.name||'').trim().toLowerCase();
  const portrait=leaguePlayerPortraits.find(entry=>entry.playerIds.includes(String(player.id))||entry.names.some(alias=>alias.toLowerCase()===name));
  if(portrait)return portrait.src;
  return typeof player.portrait==='string'?player.portrait:player.portrait?`/assets/league/player-${player.id}.jpg`:null;
}
