import {json} from '../../_lib/auth.js';
import {ensureArcade,GAME_VERSION} from '../../_lib/arcade.js';
export async function onRequestGet({env}){if(!env.DB)return json({error:'Leaderboard unavailable.'},503);await ensureArcade(env);const result=await env.DB.prepare(`SELECT u.display_name AS displayName,b.team,b.score,b.level FROM arcade_bests b JOIN users u ON u.discord_id=b.discord_id AND u.status='active' WHERE b.version=? ORDER BY b.score DESC,b.achieved_at ASC LIMIT 50`).bind(GAME_VERSION).all();return json({entries:result.results});}
