import {getSession,json,sameOrigin,randomToken} from '../../_lib/auth.js';
import {consumeRateLimit} from '../../_lib/rate-limit.js';
import {ensureGoose,createGame,replay,VERSION,pace} from '../../_lib/goose.js';
async function authorize(request,env,scope,limit){
 if(!sameOrigin(request))return {error:json({error:'Invalid request origin.'},403)};
 const user=await getSession(request,env);if(!user)return {error:json({error:'Sign in before starting a ranked run.'},401)};
 const rate=await consumeRateLimit(env,{scope,subject:String(user.discord_id),limit});if(!rate.success)return {error:json({error:'Too many requests. Please wait a minute.'},429)};return {user};
}
export async function onRequestPost({request,env}){
 const auth=await authorize(request,env,'goose-start',8);if(auth.error)return auth.error;
 await ensureGoose(env);const seed=crypto.getRandomValues(new Uint32Array(1))[0],id=randomToken(),now=Math.floor(Date.now()/1000);
 await env.DB.batch([env.DB.prepare('DELETE FROM goose_runs WHERE expires_at < ?').bind(now),env.DB.prepare('INSERT INTO goose_runs (id,discord_id,version,state,started_at,expires_at) VALUES (?,?,?,?,?,?)').bind(id,String(auth.user.discord_id),VERSION,JSON.stringify(createGame(seed)),now,now+7200)]);
 return json({id,seed,version:VERSION});
}
export async function onRequestPatch({request,env}){
 const auth=await authorize(request,env,'goose-packet',40);if(auth.error)return auth.error;
 let body;try{const raw=await request.text();if(raw.length>16000)throw Error();body=JSON.parse(raw);}catch{return json({error:'Invalid gameplay packet.'},400);}
 if(!body||typeof body.id!=='string'||body.id.length>100||!Number.isInteger(body.seq)||body.seq<0)return json({error:'Invalid run.'},400);
 const row=await env.DB.prepare('SELECT * FROM goose_runs WHERE id=? AND discord_id=?').bind(body.id,String(auth.user.discord_id)).first();const now=Math.floor(Date.now()/1000);
 if(!row||row.expires_at<now||row.version!==VERSION||row.finished||row.seq!==body.seq)return json({error:'Run expired or out of sequence. Start again to save a score.'},409);
 let result;try{result=replay(JSON.parse(row.state),body.steps);}catch{return json({error:'Gameplay verification failed.'},400);}
 const ticks=row.ticks+result.ticks;if(ticks>(now-row.started_at+20)*120)return json({error:'Gameplay was submitted too quickly.'},400);
 const token=randomToken(),g=result.game,seq=row.seq+1;
 const statements=[env.DB.prepare('UPDATE goose_runs SET state=?,seq=?,ticks=?,commit_token=?,finished=? WHERE id=? AND seq=? AND finished=0').bind(JSON.stringify(g),seq,ticks,token,result.finished?1:0,row.id,row.seq)];
 if(result.finished)statements.push(env.DB.prepare(`INSERT INTO goose_bests (discord_id,version,score,distance,pace,honks,achieved_at) SELECT discord_id,version,?,?,?,?,? FROM goose_runs WHERE id=? AND commit_token=? ON CONFLICT(discord_id,version) DO UPDATE SET score=excluded.score,distance=excluded.distance,pace=excluded.pace,honks=excluded.honks,achieved_at=excluded.achieved_at WHERE excluded.score>goose_bests.score`).bind(Math.floor(g.score),Math.floor(g.distance),Number(pace(g).toFixed(2)),g.honks,now,row.id,token));
 const saved=await env.DB.batch(statements);if(!saved[0].meta.changes)return json({error:'Run already updated.'},409);
 return json({ok:true,seq,score:Math.floor(g.score),finished:result.finished});
}
