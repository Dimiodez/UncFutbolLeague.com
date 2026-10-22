// Current creations use the public season catalog. Historical ids and artwork stay valid.
(() => {
 const rows=[],crests=new Map();
 for(const division of ['6v6','10v10']){
  const season=window.UFL_SEASONS?.['s2-'+division];
  for(const [key,[name,crest]] of Object.entries(season?.teams||{})){
   const id='s2:'+division+':'+key,identity=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
   const clubs=typeof leagueProvisionalSeasons==='undefined'?[]:leagueProvisionalSeasons[division]?.clubs||[];
   const alias=typeof leagueOfficialClubLinks==='undefined'?null:leagueOfficialClubLinks[division]?.[key]?.key;
   const local=clubs.find(c=>c.key===(alias||key))||clubs.find(c=>identity(c.name)===identity(name));
   rows.push([id,'Season 2 · '+division+' · '+name]);crests.set(id,local?.logo||(crest?.startsWith('/')?crest:'/assets/ufl-mark.webp'));
  }
 }
 window.UFLCardClubs={options:legacy=>[...rows,...legacy.map(([id,name])=>[id,'Season 1 · 6v6 · '+name])],crest:id=>crests.get(id)||'./assets/func-teams/'+id+'.png'};
})();
