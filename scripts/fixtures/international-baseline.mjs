import {INTERNATIONAL_BASELINE_EVIDENCE as evidence} from '../../functions/_lib/international-baseline.js';
export const baselineClubs={ARG:'2158989',BRA:'2159252',CAN:'2117306',ENG:'2000677',ESP:'2159493',FRA:'2159710',GER:'2148520',ITA:'2158891',MEX:'2171250',USA:'2088631'};
// Synthetic EA identities for pure tests. Never written to any live database.
export const baselineGames=()=>evidence.reports.map(r=>({matchId:r.ea.matchId,timestamp:r.ea.timestamp,clubs:{[r.ea.homeClubId]:{goals:r.ea.homeScore},[r.ea.awayClubId]:{goals:r.ea.awayScore}},players:Object.fromEntries(['home','away'].map(side=>[baselineClubs[r[side+'Id']],Object.fromEntries(Object.entries(r.match['participant_'+side+'_stats']).map(([id,s])=>[String(10000+Number(id)),{playername:s.player_name,rating:s.match_rating}]))]))}));
export const baselineTeams=()=>Object.entries(baselineClubs).map(([id,ea_club_id])=>({id,name:id,ea_club_id}));
