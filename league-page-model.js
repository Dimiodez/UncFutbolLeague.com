export const LEAGUE_TABS=[['overview','Overview'],['rules','Rules'],['videos','Videos'],['teams','Teams'],['players','Players'],['matches','Matches'],['finals','Finals'],['stats','Stats'],['standings','Standings'],['awards','Team of the Week']];

// Page publication is a local preview state, independent of registration/scheduling.
export function updatePageSettings(settings,section,values){
 if(!LEAGUE_TABS.some(([key])=>key===section))throw Error('Unknown league section.');
 const text=String(values.text??'').trim();
 if(text.length>10000)throw Error('Keep section text under 10,000 characters.');
 const content={text};
 if(section==='videos'){
  content.links=String(values.links??'').split('\n').map(line=>line.trim()).filter(Boolean);
  if(content.links.length>20)throw Error('Add up to 20 video links.');
  for(const link of content.links){let url;try{url=new URL(link);}catch{throw Error('Use full https:// video links.');}if(url.protocol!=='https:'||url.username||url.password)throw Error('Use full https:// video links without credentials.');}
 }
 if(section==='standings')for(const key of ['win','draw','loss']){
  const points=Number(values[key]);if(!Number.isInteger(points)||points<0||points>20)throw Error('Points must be whole numbers from 0 to 20.');content[key]=points;
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
