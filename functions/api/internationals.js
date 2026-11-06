import {internationalData,INTL_ID} from '../_lib/internationals.js';
import {getSession,json} from '../_lib/auth.js';
import {rosterGuard,discordName} from '../_lib/league-rosters.js';
export async function onRequest({request,env}){
 if(request.method==='GET'){try{return json(await internationalData(env));}catch{return json({error:'Internationals is temporarily unavailable. Please try again.'},503);}}
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const guard=await rosterGuard(request,env,true);if(guard.response)return guard.response;
 let body;try{const text=await request.text();if(text.length>4096)throw Error();body=JSON.parse(text);}catch{return json({error:'Invalid roster request.'},400);}
 try{
 const actor=String(guard.actor.discord_id);
 if(body.action==='addRoster'){
  const team=await env.DB.prepare('SELECT id FROM international_teams WHERE competition_id=? AND id=?').bind(INTL_ID,String(body.teamId||'')).first();if(!team)throw Error('Choose a national team.');
  let playerId=String(body.playerId||''),name;
  if(playerId){
   const p=await env.DB.prepare('SELECT id,discord_name FROM league_players WHERE id=COALESCE((SELECT canonical_id FROM league_player_aliases WHERE alias_id=?),?)').bind(playerId,playerId).first();if(!p)throw Error('Choose an existing player.');playerId=p.id;name=discordName(body.name||p.discord_name).name;
  }else{
   const parsed=discordName(body.name);name=parsed.name;
   const matches=await env.DB.prepare('SELECT p.id FROM league_players p WHERE normalized_name=? AND NOT EXISTS(SELECT 1 FROM league_player_aliases a WHERE a.alias_id=p.id)').bind(parsed.normalized).all();
   if(matches.results.length>1)throw Error('Multiple matching profiles exist. Choose the correct player.');
   playerId=matches.results[0]?.id||'player-'+crypto.randomUUID();
   if(!matches.results.length){await env.DB.prepare('INSERT INTO league_players(id,discord_name,normalized_name,created_by) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM league_players WHERE normalized_name=?)').bind(playerId,name,parsed.normalized,actor,parsed.normalized).run();const selected=await env.DB.prepare('SELECT id FROM league_players WHERE normalized_name=? ORDER BY created_at,id LIMIT 1').bind(parsed.normalized).first();playerId=selected.id;}
  }
  const existing=await env.DB.prepare('SELECT id FROM international_rosters WHERE competition_id=? AND player_id=? AND active=1').bind(INTL_ID,playerId).first();if(existing)return json({error:'This player already has an active national team. Remove the previous membership before transferring.'},409);
  const id=crypto.randomUUID();
  await env.DB.batch([env.DB.prepare('INSERT INTO international_rosters(id,competition_id,team_id,player_id,display_name,updated_by) VALUES(?,?,?,?,?,?)').bind(id,INTL_ID,team.id,playerId,name,actor),env.DB.prepare('INSERT INTO international_roster_audit(id,actor,action,roster_id,detail_json) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,'add',id,JSON.stringify({teamId:team.id,playerId,name}))]);
  return json({saved:true});
 }
 if(body.action==='deactivateRoster'){
  const row=await env.DB.prepare('SELECT id,team_id,player_id,display_name FROM international_rosters WHERE id=? AND competition_id=? AND active=1').bind(String(body.rosterId||''),INTL_ID).first();if(!row)throw Error('Roster entry not found.');
  await env.DB.batch([env.DB.prepare('UPDATE international_rosters SET active=0,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(actor,row.id),env.DB.prepare('INSERT INTO international_roster_audit(id,actor,action,roster_id,detail_json) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,'remove',row.id,JSON.stringify(row))]);return json({saved:true});
 }
 throw Error('Unknown international roster action.');
 }catch(error){return json({error:/UNIQUE constraint/.test(error.message)?'That player or roster name is already registered.':error.message},400);}
}
