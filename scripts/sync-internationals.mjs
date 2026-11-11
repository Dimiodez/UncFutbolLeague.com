// Public VA data only. National identity uses verified provider IDs, never abbreviations.
export const INTERNATIONAL_CONFIG={key:'s1-internationals',competitionId:4,seasonId:6};
export const INTERNATIONAL_TEAMS={
 28:['ITA','UFL Italy'],29:['FRA','UFL France'],30:['GER','UFL Germany'],
 31:['ESP','UFL Spain'],32:['MEX','UFL Mexico'],33:['ARG','UFL Argentina'],
 34:['ENG','UFL England'],35:['USA','UFL USA'],36:['BRA','UFL Brazil'],37:['CAN','UFL Canada']
};
const SOURCE='https://ufl.virtualarena.app/competitions/4/seasons/6';
const CATEGORIES={goals:'goals',assists:'assists',average_match_rating:'rating',goals_and_assists:'goalContributions',tackles_per_game:'tacklesPerGame',defender_cleansheet:'cleanSheets'};
function number(value,label,{integer=false}={}){
 if(value===null||value===undefined||value===''||!Number.isFinite(Number(value))||Number(value)<0||(integer&&!Number.isInteger(Number(value))))throw Error('Invalid international '+label);
 return Number(value);
}
function nation(id,name){
 const mapped=INTERNATIONAL_TEAMS[id];
 if(!mapped||mapped[1]!==name)throw Error('International VA team mapping needs review: '+id);
 return {id:mapped[0],name:mapped[1].replace(/^UFL /,'')};
}
function standingsRows(props){
 if(!Array.isArray(props.standings))throw Error('Missing international standings');
 const rows=props.standings.flatMap(g=>Array.isArray(g.teams)?g.teams:[g]);
 const out=rows.map(r=>{
  const team=nation(r.team?.id??r.participant_id,r.name),s=r.stats||{};
  const val=key=>number(s[key],key,{integer:true});
  const row={...team,played:val('played'),wins:val('wins'),draws:val('draws'),losses:val('losses'),goalsFor:val('goals_for'),goalsAgainst:val('goals_against'),points:val('points')};
  row.goalDifference=row.goalsFor-row.goalsAgainst;
  if(row.played!==row.wins+row.draws+row.losses)throw Error('International standings are incomplete');
  return row;
 });
 if(out.length!==10||new Set(out.map(t=>t.id)).size!==10)throw Error('Expected ten distinct international nations');
 return out;
}
export function normalizeInternationalCore(matches,standings,previous=null){
 const dates=new Map((matches.schedule?.dates||[]).map(d=>[Number(d.round_id),d]));
 const groups=matches.schedule?.matches;
 if(!Array.isArray(groups)||!groups.length)throw Error('Missing international schedule');
 const fixtures=groups.flatMap(g=>Object.values(g).flatMap(rows=>{
  if(!Array.isArray(rows))throw Error('Invalid international schedule group');
  return rows.map(m=>{
   const date=dates.get(Number(m.competition_season_round_id));
   if(!date?.round_name)throw Error('International round mapping missing');
   const sourceMatchId=number(m.id,'match ID',{integer:true});
   const side=key=>m['participant_'+key]?nation(m['participant_'+key+'_id'],m['participant_'+key].name):null;
   const home=side('home'),away=side('away');
   const stage=/^Round \d+$/i.test(date.round_name)?'league':'knockout';
   if(stage==='league'&&(!home||!away))throw Error('League fixture is missing a nation');
   if(home&&away&&home.id===away.id)throw Error('International fixture repeats a nation');
   const hs=m.participant_home_score,as=m.participant_away_score;
   if((hs==null)!==(as==null))throw Error('International fixture has only one score');
   const played=hs!=null&&as!=null;
   if(played&&(!home||!away))throw Error('Scored fixture is missing a nation');
   return {id:'va-intl-'+sourceMatchId,sourceMatchId,sourceUrl:'https://ufl.virtualarena.app/matches/'+sourceMatchId,
    round:date.round_name,stage,startsAt:new Date(number(date.scheduled_at,'kickoff')*1000).toISOString(),
    homeId:home?.id||null,awayId:away?.id||null,home,away,status:played?'played':'scheduled',
    homeScore:played?number(hs,'home score',{integer:true}):null,awayScore:played?number(as,'away score',{integer:true}):null,forfeit:!!m.forfeit};
  });
 })).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.sourceMatchId-b.sourceMatchId);
 if(fixtures.length<52||new Set(fixtures.map(f=>f.id)).size!==fixtures.length)throw Error('International schedule is incomplete or duplicated');
 if(previous?.fixtures?.some(f=>!fixtures.some(n=>n.id===f.id)))throw Error('International schedule lost an existing fixture');
 const table=standingsRows(standings),played=fixtures.filter(f=>f.status==='played'),league=played.filter(f=>f.stage==='league');
 for(const row of table){
  const games=league.filter(f=>[f.homeId,f.awayId].includes(row.id));
  const gf=games.reduce((n,f)=>n+(f.homeId===row.id?f.homeScore:f.awayScore),0);
  const ga=games.reduce((n,f)=>n+(f.homeId===row.id?f.awayScore:f.homeScore),0);
  if(row.played!==games.length||row.goalsFor!==gf||row.goalsAgainst!==ga)throw Error('VA international scores and standings are still updating');
 }
 return {schemaVersion:1,...INTERNATIONAL_CONFIG,source:SOURCE,fixtures,standings:table,
  totals:{played:played.length,fixtures:fixtures.length,pending:fixtures.length-played.length,goals:played.reduce((n,f)=>n+f.homeScore+f.awayScore,0)}};
}
export function validateInternationalSnapshot(snapshot){
 if(snapshot?.schemaVersion!==1||snapshot.competitionId!==4||snapshot.seasonId!==6||snapshot.key!==INTERNATIONAL_CONFIG.key)throw Error('Mismatched international VA snapshot');
 if(!Array.isArray(snapshot.fixtures)||snapshot.fixtures.length<52||!Array.isArray(snapshot.standings)||snapshot.standings.length!==10||!Array.isArray(snapshot.players))throw Error('Incomplete international VA snapshot');
 return snapshot;
}
async function categoryRows(pageProps,key){
 const path='stats/players/'+key,first=await pageProps(INTERNATIONAL_CONFIG,path);
 const initial=first.leaderboard?.records;
 const last=number(initial?.last_page,'stats last page',{integer:true});
 const total=number(initial?.total,'stats total',{integer:true});
 if(last<1||last>100||!Array.isArray(initial.data))throw Error('Invalid international stats pagination');
 const rows=[...initial.data];
 for(let page=2;page<=last;page++){
  const next=(await pageProps(INTERNATIONAL_CONFIG,path+'?page='+page)).leaderboard?.records;
  if(Number(next?.current_page)!==page||Number(next?.last_page)!==last||Number(next?.total)!==total||!Array.isArray(next.data))throw Error('International stats pagination changed during sync');
  rows.push(...next.data);
 }
 if(rows.length!==total)throw Error('International stats page is incomplete');
 return rows;
}
export async function buildInternationalSnapshot(pageProps,previous=null,{now=()=>new Date().toISOString(),warn=console.warn}={}){
 if(previous)validateInternationalSnapshot(previous);
 const [matches,standings]=await Promise.all([pageProps(INTERNATIONAL_CONFIG,'matches'),pageProps(INTERNATIONAL_CONFIG,'standings')]);
 const core=normalizeInternationalCore(matches,standings,previous);
 const statResults=await Promise.allSettled(Object.keys(CATEGORIES).map(async category=>[category,await categoryRows(pageProps,category)]));
 let players,statsStatus,statsFetchedAt;
 try{
  const failed=statResults.filter(r=>r.status==='rejected');
  if(failed.length)throw Error(failed.map(r=>r.reason.message).join('; '));
  const merged=new Map();
  for(const {value:[category,rows]} of statResults)for(const row of rows){
   const team=Object.values(INTERNATIONAL_TEAMS).find(t=>t[1]===row.team?.name);
   const url=new URL(row.data?.url||'https://invalid.example');
   if(!team||url.origin!=='https://ufl.virtualarena.app'||!url.pathname.startsWith('/users/')||!row.data?.name)throw Error('Unknown international player/team source');
   const id=team[0]+':'+url.pathname;
   const existing=merged.get(id)||{id,name:row.data.name,teamId:team[0],teamName:team[1].replace(/^UFL /,''),sourceUrl:url.origin+url.pathname,apps:0,goals:null,assists:null,rating:null,goalContributions:null,tacklesPerGame:null,cleanSheets:null};
   if(existing[CATEGORIES[category]]!==null)throw Error('Duplicated international stats player page');
   existing.apps=Math.max(existing.apps,number(row.played,'appearances',{integer:true}));
   existing[CATEGORIES[category]]=number(row[category],category);
   merged.set(id,existing);
  }
  players=[...merged.values()].sort((a,b)=>(b.goals??-1)-(a.goals??-1)||(b.assists??-1)-(a.assists??-1)||a.name.localeCompare(b.name));
  if(core.totals.played&&!players.length)throw Error('VA has results but no player statistics');
  statsStatus='available';statsFetchedAt=now();
 }catch(error){
  warn('::warning::International stats retained: '+error.message);
  players=previous?.players||[];statsFetchedAt=previous?.statsFetchedAt||null;
  statsStatus=statsFetchedAt?'stale':'pending';
 }
 const candidate={...core,players,statsStatus,statsFetchedAt,syncedAt:now()};
 // Avoid a new deployment when VA's actual published data has not changed.
 const content=s=>{const {syncedAt,statsFetchedAt,...data}=s;return JSON.stringify(data);};
 return previous&&content(previous)===content(candidate)?previous:candidate;
}
