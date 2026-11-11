import {INTERNATIONAL_VA_FIXTURES} from '../../functions/_lib/international-va-fixtures.js';
import {INTERNATIONAL_TEAMS} from '../sync-internationals.mjs';
export function internationalFixtureSource(){
 const byCode=Object.fromEntries(Object.entries(INTERNATIONAL_TEAMS).map(([id,[code,name]])=>[code,{id:Number(id),name}]));
 const dates=[...new Set(INTERNATIONAL_VA_FIXTURES.map(f=>f.round))].map((round,i)=>({round_id:80+i,round_name:round,scheduled_at:Date.parse(INTERNATIONAL_VA_FIXTURES.find(f=>f.round===round).startsAt)/1000}));
 const fixtures=INTERNATIONAL_VA_FIXTURES.map((f,i)=>({
  id:f.sourceMatchId,competition_season_round_id:dates.find(d=>d.round_name===f.round).round_id,group_id:f.stage==='league'?1:null,
  participant_home_id:byCode[f.homeId]?.id||null,participant_away_id:byCode[f.awayId]?.id||null,
  participant_home:f.homeId?{name:byCode[f.homeId].name}:null,participant_away:f.awayId?{name:byCode[f.awayId].name}:null,
  participant_home_score:i<10?0:null,participant_away_score:i<10?i%3:null
 }));
 const teams=Object.values(byCode).map(t=>{
  const matches=fixtures.filter(f=>f.participant_home_score!==null&&[f.participant_home_id,f.participant_away_id].includes(t.id));
  const stats={played:matches.length,wins:0,draws:0,losses:0,goals_for:0,goals_against:0,points:0};
  for(const f of matches){const home=f.participant_home_id===t.id,gf=home?f.participant_home_score:f.participant_away_score,ga=home?f.participant_away_score:f.participant_home_score;
   stats.goals_for+=gf;stats.goals_against+=ga;stats[gf>ga?'wins':gf===ga?'draws':'losses']++;stats.points+=gf>ga?3:gf===ga?1:0;
  }return {name:t.name,team:{id:t.id,abbr:t.id===28?'ITL':''},stats};
 });
 const source={matches:{schedule:{dates,matches:dates.map(d=>({[d.round_name]:fixtures.filter(f=>f.competition_season_round_id===d.round_id)}))}},standings:{standings:[{name:'Group A',teams}]}};
 const requested=[];
 const pageProps=async(config,path)=>{
  requested.push(path);if(config.competitionId!==4||config.seasonId!==6)throw Error('Wrong season');
  if(source[path])return source[path];
  const [part,query]=path.split('?'),category=part.split('/').at(-1),page=Number(new URLSearchParams(query).get('page')||1);
  const count=category==='average_match_rating'?1:12,last=Math.ceil(count/10);
  return {leaderboard:{records:{current_page:page,last_page:last,total:count,data:Array.from({length:Math.min(10,count-(page-1)*10)},(_,i)=>{
   const n=(page-1)*10+i;return {data:{name:'Player '+n,url:'https://ufl.virtualarena.app/users/player-'+n},team:{name:'UFL Italy'},played:2,[category]:category==='average_match_rating'?8.2:n%3};
  })}}};
 };
 return {source,pageProps,requested};
}
