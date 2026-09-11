import {json} from '../../_lib/auth.js';
import {ensureGoose,VERSION} from '../../_lib/goose.js';
export async function onRequestGet({env}){
 if(!env.DB)return json({error:'Leaderboard unavailable.'},503);await ensureGoose(env);
 const result=await env.DB.prepare(`SELECT u.display_name AS displayName,b.score,b.distance,b.pace,b.honks FROM goose_bests b JOIN users u ON u.discord_id=b.discord_id AND u.status='active' WHERE b.version=? ORDER BY b.score DESC,b.achieved_at ASC LIMIT 50`).bind(VERSION).all();return json({entries:result.results});
}
