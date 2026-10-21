import {validateAwardBoard,awardBoardKey} from './league-awards-model.js';
import {validateCupPlans} from './league-cups.js';
export const LEAGUE_TABS=[['overview','Overview'],['rules','Rules'],['videos','Stream Links'],['teams','Teams'],['players','Players'],['matches','Matches'],['finals','Finals'],['stats','Stats'],['standings','Standings'],['awards','TOTW / TOTS']];
export const STAT_METRICS=[['goals','Goals'],['assists','Assists'],['rating','Average rating'],['shots','Shots'],['passes','Passing success'],['tackles','Successful tackles'],['interceptions','Interceptions'],['saves','Saves']];
export const TIEBREAKERS=[['goalDifference','Goal difference'],['goalsFor','Goals scored'],['wins','Wins'],['headToHead','Head-to-head']];
export const FORMATIONS=['2-2-1','3-1-1','2-1-2','2-2-2','3-2-1','4-3-2','4-2-3','3-4-2','4-3-3','4-2-3-1','4-4-2','3-5-2','Custom'];
const integer=(value,min,max,label)=>{const number=Number(value);if(value===''||value===null||!Number.isInteger(number)||number<min||number>max)throw Error(`${label} must be a whole number from ${min} to ${max}.`);return number;};
const boolean=(value,label)=>{if(typeof value!=='boolean')throw Error(`Choose whether ${label} is enabled.`);return value;};
const choice=(value,options,label)=>{if(!options.includes(value))throw Error(`Choose a valid ${label}.`);return value;};
const https=value=>{let url;try{url=new URL(value);}catch{throw Error('Use full https:// video links.');}if(url.protocol!=='https:'||url.username||url.password||value.length>2000)throw Error('Use full https:// video links without credentials.');return value;};

// Page publication is a local preview state, independent of registration/scheduling.
export function updatePageSettings(settings,section,values){
 if(!LEAGUE_TABS.some(([key])=>key===section))throw Error('Unknown league section.');
 const text=String(values.text??settings.pageContent?.[section]?.text??'').trim();
 if(text.length>10000)throw Error('Keep section text under 10,000 characters.');
 const content={text};
 if(section==='videos'){
  if(values.streams!==undefined){
   if(!Array.isArray(values.streams)||values.streams.length>120)throw Error('Add up to 120 stream links.');
   content.streams=values.streams.map(stream=>{
    if(!stream||typeof stream.name!=='string'||!stream.name.trim()||stream.name.length>120||typeof stream.url!=='string'||!settings.teams.some(t=>t.id===stream.teamId))throw Error('Select a registered team and give each streamer a name and HTTPS link.');
    return {teamId:stream.teamId,name:stream.name.trim(),url:https(stream.url.trim())};
   });
  }
  const videos=values.videos??String(values.links??'').split('\n').map(line=>line.trim()).filter(Boolean).map(url=>({title:'Video',url}));
  if(!Array.isArray(videos)||videos.length>20)throw Error('Add up to 20 videos.');
  content.videos=videos.map(video=>{if(!video||typeof video.title!=='string'||!video.title.trim()||video.title.length>120||typeof video.url!=='string')throw Error('Give each video a title and link.');return {title:video.title.trim(),url:https(video.url.trim())};});
  content.links=content.videos.map(video=>video.url);
 }
 if(section==='standings'){for(const key of ['win','draw','loss']){
  content[key]=integer(values[key],0,20,'Points');
 }
  content.extraTimeWin=integer(values.extraTimeWin??2,0,20,'Extra-time win points');content.extraTimeLoss=integer(values.extraTimeLoss??1,0,20,'Extra-time loss points');content.noDraws=true;
  const order=values.tiebreakers??TIEBREAKERS.map(([key])=>key);
  if(!Array.isArray(order)||order.length!==TIEBREAKERS.length||new Set(order).size!==order.length||order.some(key=>!TIEBREAKERS.some(([allowed])=>allowed===key)))throw Error('Use each tiebreaker once.');content.tiebreakers=[...order];
 }
 if(section==='rules'){
  if(values.items!==undefined){if(!Array.isArray(values.items)||values.items.length>50)throw Error('Use up to 50 rules.');content.items=values.items.map(rule=>{if(!rule||typeof rule.title!=='string'||!rule.title.trim()||rule.title.length>120||typeof rule.body!=='string'||!rule.body.trim()||rule.body.length>3000)throw Error('Each rule needs a title (120 characters) and description (3,000 characters).');return {category:choice(rule.category,['Gameplay','Conduct','Scheduling','Eligibility'],'rule category'),title:rule.title.trim(),body:rule.body.trim()};});}
  for(const key of ['ampsAllowed','boostsAllowed','anyAllowed'])if(values[key]!==undefined)content[key]=boolean(values[key],key);
 }
 if(section==='players'){
  for(const key of ['requireEaIdentity','transferWindowOnly'])if(values[key]!==undefined)content[key]=boolean(values[key],key);
  content.oneTeamPerLeague=true;
 }
 if(section==='finals'&&values.format!==undefined){
  content.format=choice(values.format,['none','knockout','topBottom'],'finals format');content.qualifiers=integer(values.qualifiers,2,32,'Qualifying teams');content.legs=integer(values.legs,1,2,'Legs per tie');content.thirdPlace=boolean(values.thirdPlace,'third-place match');
  if(content.format!=='none'&&(content.qualifiers&(content.qualifiers-1)))throw Error('Knockout brackets need 2, 4, 8, 16 or 32 qualifying teams.');
 }
 if(section==='finals'&&(values.cupPlans||settings.pageContent?.finals?.cupPlans))content.cupPlans=validateCupPlans(values.cupPlans??settings.pageContent.finals.cupPlans);
 if(section==='stats'&&values.metrics!==undefined){
  if(!Array.isArray(values.metrics)||!values.metrics.length||new Set(values.metrics).size!==values.metrics.length||values.metrics.some(key=>!STAT_METRICS.some(([allowed])=>allowed===key)))throw Error('Choose at least one supported statistic.');
  content.metrics=[...values.metrics];content.minAppearances=integer(values.minAppearances,1,100,'Minimum appearances');content.excludeDisconnectRatings=boolean(values.excludeDisconnectRatings,'excluding 3.0 ratings');
 }
 if(section==='awards'&&values.formation!==undefined){
  content.formation=choice(values.formation,FORMATIONS,'formation');content.minAppearances=integer(values.minAppearances,1,100,'Minimum appearances');content.ranking=choice(values.ranking,['rating','goals','assists','tackles'],'ranking statistic');
 }
 if(section==='awards'){
  if(values.workbench!==undefined)content.workbench=validateAwardBoard(values.workbench);
  if(values.savedBoards!==undefined){if(!Array.isArray(values.savedBoards)||values.savedBoards.length>100)throw Error('Save up to 100 award selections per league.');content.savedBoards=values.savedBoards.map(validateAwardBoard);if(new Set(content.savedBoards.map(awardBoardKey)).size!==content.savedBoards.length)throw Error('Keep one saved award selection per period.');}
 }
 return {...settings,pageContent:{...settings.pageContent,[section]:content}};
}

export function setPagePublished(settings,published){
 if(typeof published!=='boolean')throw Error('Choose a publication state.');
 return {...settings,pagePublished:published};
}

export function editDraftTeam(draft,id,values){
 if(draft.scheduleGenerated)throw Error('Reopen registration before changing teams. This clears the draft fixtures so they can be regenerated.');
 if(!draft.settings.teams.some(team=>team.id===id))throw Error('Team not found.');
 const name=String(values.name??'').trim(),eaClubId=String(values.eaClubId??'').trim();
 if(!name||name.length>80||eaClubId&&!/^\d{1,20}$/.test(eaClubId))throw Error('Enter a team name and an optional numeric EA club ID.');
 if(draft.settings.teams.some(team=>team.id!==id&&(team.name.toLowerCase()===name.toLowerCase()||eaClubId&&team.eaClubId===eaClubId)))throw Error('That team name or EA club ID is already in this league.');
 return {...draft,settings:{...draft.settings,teams:draft.settings.teams.map(team=>team.id===id?{...team,name,eaClubId}:team)}};
}

export function removeDraftTeam(draft,id){
 if(draft.scheduleGenerated)throw Error('Reopen registration before removing teams so fixtures can be regenerated.');
 if(!draft.settings.teams.some(team=>team.id===id))throw Error('Team not found.');
 const settings={...draft.settings,teams:draft.settings.teams.filter(team=>team.id!==id)};
 if(settings.pageContent?.videos?.streams)settings.pageContent={...settings.pageContent,videos:{...settings.pageContent.videos,streams:settings.pageContent.videos.streams.filter(s=>s.teamId!==id)}};
 return {...draft,settings};
}
