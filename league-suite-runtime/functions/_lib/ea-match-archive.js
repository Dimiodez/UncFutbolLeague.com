import {clubPlayers,detailedStats,numeric} from '../../league-player-stats.js';

const identity=game=>String(game.matchId??game.id??'');
const records=game=>new Map(Object.keys(game.clubs||{}).flatMap(club=>clubPlayers(game,club).filter(([,p])=>String(p?.playername??p?.name??'').trim()).map(([id,p])=>[club+'|'+id,p])));
function quality(game){
 const players=Object.keys(game.clubs||{}).flatMap(id=>clubPlayers(game,id).filter(([,p])=>String(p?.playername??p?.name??'').trim()));
 const stats=players.map(([,p])=>p),ratings=stats.map(p=>numeric(p.rating));
 return {players:stats.length,ratings:ratings.filter(r=>r>0&&r<=10&&r!==3).length,
  fields:stats.reduce((n,p)=>n+[numeric(p.goals),numeric(p.assists),...Object.values(detailedStats(p))].filter(v=>v!==null).length,0)};
}
export function preferredMatch(previous,incoming){
 if(!previous)return incoming;
 if(identity(previous)!==identity(incoming))throw Error('Cannot combine different EA matches.');
 if(JSON.stringify(Object.keys(previous.clubs||{}).sort())!==JSON.stringify(Object.keys(incoming.clubs||{}).sort()))return previous;
 const old=quality(previous),next=quality(incoming);
 const updated=records(incoming);
 for(const [id,p] of records(previous)){const n=updated.get(id);if(!n)return previous;
  const fields=p=>({rating:numeric(p.rating),goals:numeric(p.goals),assists:numeric(p.assists),...detailedStats(p)}),was=fields(p),now=fields(n);
  if(Object.keys(was).some(k=>was[k]!==null&&now[k]===null))return previous;
  if(was.rating>0&&was.rating<=10&&was.rating!==3&&!(now.rating>0&&now.rating<=10&&now.rating!==3))return previous;
 }
 // Retain a complete response when another feed temporarily returns less data.
 // Equal-quality later observations may contain EA's finalized stat values.
 return next.players>=old.players&&next.ratings>=old.ratings&&next.fields>=old.fields?incoming:previous;
}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
export async function archiveMatches(db,leagueId,games,{now=new Date().toISOString()}={}){
 const existing=await db.prepare('SELECT match_id,game_json FROM preview_ea_match_archive WHERE league_id=?').bind(leagueId).all();
 const current=new Map(existing.results.map(r=>[String(r.match_id),JSON.parse(r.game_json)])),statements=[];
 async function observation(game){
  const matchId=identity(game);if(!matchId)throw Error('Missing EA match identity.');
  // Ignore the changing relative time label when identifying repeated payloads.
  const {timeAgo,...stable}=game,bytes=new TextEncoder().encode(JSON.stringify(canonical(stable))),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  statements.push(db.prepare('INSERT OR IGNORE INTO preview_ea_match_observations(league_id,match_id,payload_hash,game_json,observed_at) VALUES(?,?,?,?,?)').bind(leagueId,matchId,hash,JSON.stringify(game),now));
 }
 const touched=new Set();
 for(const game of games){const id=identity(game),previous=current.get(id);if(!touched.has(id)&&previous)await observation(previous);await observation(game);current.set(id,preferredMatch(previous,game));touched.add(id);}
 for(const id of touched)statements.push(db.prepare('INSERT INTO preview_ea_match_archive(league_id,match_id,game_json) VALUES(?,?,?) ON CONFLICT(league_id,match_id) DO UPDATE SET game_json=excluded.game_json').bind(leagueId,id,JSON.stringify(current.get(id))));
 // D1 batches have bounded statement counts; all raw observations are retained
 // before the preferred payload changes. Repeated polls are idempotent.
 for(let i=0;i<statements.length;i+=60)await db.batch(statements.slice(i,i+60));
 return [...current.values()];
}
