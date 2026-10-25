// Character portraits belong to players, never a league/team membership row.
// Keep only confirmed identity aliases here; never match fuzzy display names.
const leaguePlayerPortraits = [
  {playerIds:['1790183123676-110','1790179840025','1790040141524'],names:['DimiOdez','Odez'],src:'/assets/league/player-1790183123676-110-white-kit.png'},
  {playerIds:['1790642010611'],names:['DMellow'],src:'/assets/league/player-1790642010611-white-kit.png'},
  {playerIds:['1790190859244-598','1790122570549'],names:['Ripp','Rippy Nolan'],src:'/assets/league/player-1790190859244-598-white-kit-v1.webp'}
];
// Existing files only. Shared portraits follow confirmed roster identities, never guessed names.
const leagueLegacyPortraitIds=new Set(["1790037412465","1790037428289","1790037441815","1790037457695","1790037469426","1790037493288","1790040112875","1790040121906","1790040132841","1790040141524","1790040167969","1790040177840","1790120496563-364","1790120496887-778","1790120496984-243","1790120497079-130","1790120497236-845","1790120497356-13","1790121424937","1790121469933","1790121476332","1790122562723","1790122570549","1790122580955","1790122588664","1790122597540","1790122602942","1790122626361","1790122659659","1790122664677","1790122674539","1790122712488","1790123449585","1790123457233","1790123471439","1790123489190","1790123503783","1790179826433","1790179840025","1790179851406","1790179864164","1790181684544-51","1790181684658-361","1790181684781-316","1790181684846-757","1790181684944-833","1790181685288-757","1790182936683-637","1790183123676-110","1790190586159-566","1790190586283-677","1790190704776-702","1790190704881-937","1790190704973-305","1790190705067-576","1790190778704-703","1790190802026","1790190859371-163","1790619965030","1790622551235","1790642010611","1790642026871","1790642340767-864","1790644756893"]);
function playerPortraitEntry(player){
  const name=String(player.name||'').trim().toLowerCase();
  return leaguePlayerPortraits.find(entry=>entry.playerIds.includes(String(player.id))||entry.playerIds.includes(String(player.identity||''))||entry.names.some(alias=>alias.toLowerCase()===name));
}
function playerPortraitIdentity(player){return String(player.identity||playerPortraitEntry(player)?.playerIds[0]||player.id);}
function playerIdentityKey(player){
  const identity=player.identity||playerPortraitEntry(player)?.playerIds[0];
  return identity?`id:${identity}`:String(player.name||'').trim().toLowerCase()||`id:${player.id}`;
}
function playerPortraitSource(player){
  const identity=playerPortraitIdentity(player);
  const published=typeof leaguePlayerPhotoState!=='undefined'?(leaguePlayerPhotoState.portraits?.[player.id]||leaguePlayerPhotoState.byIdentity?.[identity]):null;
  if(published)return published;
  const portrait=playerPortraitEntry(player);if(portrait)return portrait.src;
  const linked=player.identity&&typeof leagueManagedRosterState!=='undefined'?Object.values(leagueManagedRosterState.players||{}).flat().filter(p=>p.identity===player.identity):[];
  const shared=linked.slice().sort((a,b)=>Number(String(b.id)===identity)-Number(String(a.id)===identity)).find(p=>typeof p.portrait==='string');
  if(shared)return shared.portrait;
  if(typeof player.portrait==='string')return player.portrait;
  const source=[identity,String(player.id),...linked.map(p=>String(p.id))].find(id=>leagueLegacyPortraitIds.has(id));
  if(source)return `/assets/league/player-${source}.jpg`;
  return null;
}
