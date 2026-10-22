// URL state is presentation only: it never changes a league or grants access.
export function workspaceId(settings){
 if(settings.trialSchedule||settings.workspaceId||settings.serverLeagueId)return settings.trialSchedule||settings.workspaceId||settings.serverLeagueId;
 let hash=2166136261;for(const c of JSON.stringify([settings.season,settings.league]))hash=Math.imul(hash^c.charCodeAt(0),16777619);
 return 'draft-'+(hash>>>0).toString(36);
}
export function workspaceLocation(href,drafts,tabs){
 const url=new URL(href,'https://www.uncfutbolleague.com');
 const id=url.searchParams.get('league'),index=drafts.findIndex(d=>workspaceId(d.settings)===id);
 return {index:index<0?null:index,tab:tabs.includes(url.searchParams.get('section'))?url.searchParams.get('section'):'overview'};
}
export function workspaceUrl(href,settings,tab='overview'){
 const url=new URL(href,'https://www.uncfutbolleague.com');
 if(settings){url.searchParams.set('league',workspaceId(settings));url.searchParams.set('section',tab);}
 else{url.searchParams.delete('league');url.searchParams.delete('section');}
 return url.pathname+url.search+url.hash;
}
