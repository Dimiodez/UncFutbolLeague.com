import {FOOTBALL_POSITIONS} from './fc27-formations.js';
export const PLAYER_POSITIONS=[...FOOTBALL_POSITIONS,'FWD','MID','DEF','UNK'];
export const DETAIL_FIELDS=['shots','shotsOnTarget','passes','passesCompleted','tackles','tacklesWon','interceptions','saves','redCards','yellowCards','manOfTheMatch'];
export const numeric=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;
export function eaPosition(value){const label=String(value||'').toUpperCase();return PLAYER_POSITIONS.includes(label)?label:({FORWARD:'FWD',MIDFIELDER:'MID',DEFENDER:'DEF',GOALKEEPER:'GK'})[label]||'UNK';}
export function clubPlayers(game,clubId){
 const players=game.players||{};
 // The relay supplies flat player records; support raw EA's club-keyed form too.
 if(players[clubId]&&typeof players[clubId]==='object'&&!('clubId' in players[clubId])&&!('playername' in players[clubId])&&!('name' in players[clubId]))return Object.entries(players[clubId]);
 return Object.entries(players).filter(([,p])=>p&&String(p.clubId)===String(clubId));
}
export function detailedStats(player){return Object.fromEntries(DETAIL_FIELDS.map(key=>[key,numeric(player[key])]));}
export function playerTotals(records,{excludeDisconnectRatings=true}={}){
 const rows=new Map(),fields=['goals','assists',...DETAIL_FIELDS];
 for(const p of records){const key=JSON.stringify([p.teamId,p.playerId]);if(!rows.has(key))rows.set(key,{...p,apps:0,totals:Object.fromEntries(fields.map(k=>[k,0])),known:Object.fromEntries(fields.map(k=>[k,true])),ratingSum:0,ratingCount:0});const r=rows.get(key);r.apps++;
  for(const k of fields){const value=numeric(k==='goals'||k==='assists'?p[k]:p.details?.[k]);if(value===null)r.known[k]=false;else r.totals[k]+=value;}
  if(p.rating>0&&p.rating<=10&&!(excludeDisconnectRatings&&p.rating===3)){r.ratingSum+=p.rating;r.ratingCount++;}
 }
 return [...rows.values()].map(r=>({...r,averageRating:r.ratingCount?r.ratingSum/r.ratingCount:null,passAccuracy:r.known.passes&&r.known.passesCompleted&&r.totals.passes?100*r.totals.passesCompleted/r.totals.passes:null,tackleAccuracy:r.known.tackles&&r.known.tacklesWon&&r.totals.tackles?100*r.totals.tacklesWon/r.totals.tackles:null}));
}
