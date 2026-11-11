import {internationalVaSnapshot} from './international-va-snapshot.js';
import {INTERNATIONAL_VA_FIXTURES,INTERNATIONAL_VA_SOURCE} from './international-va-fixtures.js';
import {projectLeague} from './league-centre.js';
export const INTL_ID='ufl-internationals';
export const INTERNATIONAL_DIVISIONS=[
 {id:'europe',name:'European Division',teamIds:['ENG','FRA','GER','ITA','ESP']},
 {id:'americas',name:'Americas Division',teamIds:['ARG','BRA','CAN','MEX','USA']}
];
export const internationalDivisionFor=teamId=>INTERNATIONAL_DIVISIONS.find(d=>d.teamIds.includes(teamId))?.id||null;

export const escape=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export async function internationalData(env){
 const competition=await env.DB.prepare('SELECT * FROM international_competitions WHERE id=?').bind(INTL_ID).first();
 if(!competition)throw Error('Internationals is not available yet.');
 const teams=(await env.DB.prepare('SELECT * FROM international_teams WHERE competition_id=? ORDER BY name').bind(INTL_ID).all()).results;
 const rows=(await env.DB.prepare(`SELECT r.id,r.team_id,r.display_name,r.player_id,p.id canonical_id,p.discord_name,
 (SELECT m.profile_id FROM league_roster_memberships m WHERE m.player_id=p.id AND m.season='2' ORDER BY m.division DESC LIMIT 1) profile_id,
 (SELECT m.division FROM league_roster_memberships m WHERE m.player_id=p.id AND m.season='2' ORDER BY m.division DESC LIMIT 1) division
 FROM international_rosters r LEFT JOIN league_players p ON p.id=COALESCE((SELECT canonical_id FROM league_player_aliases WHERE alias_id=r.player_id),r.player_id)
 WHERE r.competition_id=? AND r.active=1 ORDER BY r.display_name COLLATE NOCASE`).bind(INTL_ID).all()).results;
 const windows=(await env.DB.prepare('SELECT id,name,starts_on,ends_on FROM international_windows WHERE competition_id=? ORDER BY starts_on').bind(INTL_ID).all()).results;
 const selections=(await env.DB.prepare('SELECT id,title,period_label,payload_json FROM international_selections WHERE competition_id=? AND published=1 ORDER BY rowid DESC').bind(INTL_ID).all()).results.map(r=>({...r,players:JSON.parse(r.payload_json),payload_json:undefined}));
 let league=null;
 if(competition.publish_results&&competition.shared_league_id){
  if(!env.LEAGUE_SUITE_DB)throw Error('Published international results are temporarily unavailable.');
  const row=await env.LEAGUE_SUITE_DB.prepare('SELECT id,draft_json,revision,enabled,checked_at,succeeded_at FROM preview_league_results WHERE id=?').bind(competition.shared_league_id).first();
  if(!row)throw Error('Published international results are temporarily unavailable.');
  league=projectLeague(row);
  const expected=new Set(teams.map(t=>t.id));
  if(league.teams.length!==expected.size||league.teams.some(t=>!expected.has(t.id)))throw Error('International team mappings need review.');
 }
 const va=league?null:await internationalVaSnapshot(env);
 if(va){const expected=new Set(teams.map(t=>t.id));if(va.standings.some(t=>!expected.has(t.id))||new Set(va.standings.map(t=>t.id)).size!==expected.size)throw Error('International team mappings need review.');}
 return {competition:{id:competition.id,name:competition.name,minPlayers:competition.match_min,maxPlayers:competition.match_max,humanKeepers:!!competition.human_keepers},
 source:{...INTERNATIONAL_VA_SOURCE,...(va?{syncedAt:va.syncedAt,statsFetchedAt:va.statsFetchedAt,statsStatus:va.statsStatus}:{} )},
 divisions:INTERNATIONAL_DIVISIONS.map(d=>({...d,teamIds:[...d.teamIds]})),
 teams:teams.map(t=>({id:t.id,divisionId:internationalDivisionFor(t.id),name:t.name,flag:t.flag,color:t.color,linked:!!t.ea_club_id,roster:rows.filter(r=>r.team_id===t.id).map(r=>({id:r.id,name:r.display_name,playerId:r.canonical_id||r.player_id,profileUrl:r.player_id?'/players/'+encodeURIComponent(r.profile_id||r.player_id)+'?season=2&division='+(r.division||'6v6'):null}))})),
 windows,selections,fixtures:va?.fixtures||internationalFixtures(teams,league?.fixtures||[]),standings:va?.standings||league?.standings||teams.map(t=>({id:t.id,name:t.name,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,goalDifference:0,points:0})),
 players:va?.players||league?.players||[],resultsPublished:!!(league||va),totals:va?.totals||league?.totals||{played:0,fixtures:INTERNATIONAL_VA_FIXTURES.length,pending:0,goals:0}};
}

export function internationalFixtures(teams,projected=[]){
 const validLeagueIds=new Set(INTERNATIONAL_VA_FIXTURES.filter(f=>f.stage==='league').map(f=>f.id));
 if(projected.some(f=>!validLeagueIds.has(f.id)))throw Error('International fixture mappings need review.');
 const byId=new Map(projected.map(f=>[f.id,f])),team=id=>id?{id,name:teams.find(t=>t.id===id)?.name||id}:null;
 return INTERNATIONAL_VA_FIXTURES.map(f=>{
  const live=byId.get(f.id);
  return {...f,home:team(f.homeId),away:team(f.awayId),status:'scheduled',homeScore:null,awayScore:null,...live,stage:f.stage,round:f.round,sourceUrl:f.sourceUrl,sourceMatchId:f.sourceMatchId};
 });
}
