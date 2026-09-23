import {getSession,json,sameOrigin,randomToken} from '../../_lib/auth.js';
import {consumeRateLimit} from '../../_lib/rate-limit.js';
import {ensureSandy,scoreRun} from '../../_lib/sandy.js';
export async function onRequestPost({request,env}) {
  if(!sameOrigin(request))return json({error:'Invalid request origin.'},403);
  const user=await getSession(request,env);
  if(!user)return json({error:'Sign in with Discord before playing to save your score.'},401);
  const rate=await consumeRateLimit(env,{scope:'sandy-run',subject:String(user.discord_id),limit:20});
  if(!rate.success)return json({error:'Please wait a minute before trying again.'},429);
  let body;try {const raw=await request.text();if(raw.length>1000000)throw Error();body=JSON.parse(raw);}catch{return json({error:'Invalid run.'},400);}
  if(!body||typeof body!=='object')return json({error:'Invalid run.'},400);
  await ensureSandy(env);
  const now=Math.floor(Date.now()/1000);
  if(body.action==='start') {
    const id=randomToken();
    await env.DB.batch([env.DB.prepare('DELETE FROM sandy_runs WHERE expires_at < ?').bind(now),env.DB.prepare('INSERT INTO sandy_runs (id,discord_id,started_at,expires_at) VALUES (?,?,?,?)').bind(id,String(user.discord_id),now,now+10800)]);
    return json({id});
  }
  if(body.action!=='finish'||typeof body.id!=='string'||body.id.length>100)return json({error:'Invalid run.'},400);
  const run=await env.DB.prepare('SELECT * FROM sandy_runs WHERE id=? AND discord_id=?').bind(body.id,String(user.discord_id)).first();
  if(!run||run.finished||run.expires_at<now)return json({error:'Run expired or already saved.'},409);
  let result;try{result=scoreRun(body.events,body.duration,now-run.started_at);}catch{return json({error:'Run could not be validated.'},400);}
  const token=randomToken();
  const saved=await env.DB.batch([
    env.DB.prepare('UPDATE sandy_runs SET finished=1,commit_token=? WHERE id=? AND finished=0').bind(token,run.id),
    env.DB.prepare(`INSERT INTO sandy_bests (discord_id,score,seconds,combo,achieved_at) SELECT discord_id,?,?,?,? FROM sandy_runs WHERE id=? AND commit_token=? ON CONFLICT(discord_id) DO UPDATE SET score=excluded.score,seconds=excluded.seconds,combo=excluded.combo,achieved_at=excluded.achieved_at WHERE excluded.score>sandy_bests.score`).bind(result.score,result.seconds,result.combo,now,run.id,token)
  ]);
  if(!saved[0].meta.changes)return json({error:'Run already saved.'},409);
  return json({ok:true,...result});
}
