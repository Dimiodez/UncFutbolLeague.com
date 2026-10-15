import { getSession, json, sameOrigin } from '../../_lib/auth.js';
import { ensureMemberTitles,memberTeamTitles,validateTeamTitles } from '../../_lib/member-titles.js';
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return json({error:'Invalid request origin.'},403);
 const actor=await getSession(request,env);
 if(!actor||!['owner','admin'].includes(actor.role))return json({error:'Administrator access required.'},403);
 let body;try{body=await request.json();}catch{return json({error:'Invalid request.'},400);}
 const discordId=String(body?.discordId||'');
 if(!/^\d{15,22}$/.test(discordId))return json({error:'Invalid member.'},400);
 const target=await env.DB.prepare('SELECT discord_id FROM users WHERE discord_id = ?').bind(discordId).first();
 if(!target)return json({error:'Member not found.'},404);
 await ensureMemberTitles(env);
 const existing=await memberTeamTitles(env,discordId);let assignments;
 if(!Object.hasOwn(body,'assignments')&&existing.length>1)return json({error:'This member has multiple teams. Refresh the admin page before editing their titles.'},409);
 try{
  if(Object.hasOwn(body,'assignments'))assignments=validateTeamTitles(body.assignments,existing);
  else{
   // Compatibility for the old single-title editor. Titles remain display-only.
   const title=String(body.title||'').toLowerCase(),teamName=String(body.teamName||'').trim();
   if(!title)assignments=[];
   else{if(!['captain','manager'].includes(title)||!teamName||teamName.length>100)throw Error('Choose a valid title and team.');
    assignments=[{teamId:'legacy:'+teamName,title,teamName,division:''}];}
  }
 }catch(error){return json({error:error.message},400);}
 const statements=[env.DB.prepare('DELETE FROM member_team_titles WHERE discord_id = ?').bind(discordId),
 env.DB.prepare('DELETE FROM member_titles WHERE discord_id = ?').bind(discordId)];
 for(const item of assignments)statements.push(env.DB.prepare('INSERT INTO member_team_titles(discord_id,team_id,title,team_name,division,assigned_by) VALUES(?,?,?,?,?,?)').bind(discordId,item.teamId,item.title,item.teamName,item.division,String(actor.discord_id)));
 const primary=assignments[0];
 if(primary)statements.push(env.DB.prepare('INSERT INTO member_titles(discord_id,title,team_name,assigned_by) VALUES(?,?,?,?)').bind(discordId,primary.title,primary.teamName,String(actor.discord_id)));
 statements.push(env.DB.prepare("INSERT INTO audit_log(actor_discord_id,action,target_discord_id,details) VALUES(?,'team_titles_updated',?,?)").bind(String(actor.discord_id),discordId,JSON.stringify({before:existing,after:assignments})));
 await env.DB.batch(statements);
 return json({ok:true,teamTitles:assignments,title:primary?.title||null,teamName:primary?.teamName||null});
}
