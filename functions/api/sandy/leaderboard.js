import {json} from '../../_lib/auth.js';
import {ensureSandy} from '../../_lib/sandy.js';
export async function onRequestGet({env}) {
  if(!env.DB)return json({error:'Leaderboard unavailable.'},503);
  await ensureSandy(env);
  const result=await env.DB.prepare(`SELECT u.display_name AS displayName,b.score,b.seconds,b.combo FROM sandy_bests b JOIN users u ON u.discord_id=b.discord_id AND u.status='active' ORDER BY b.score DESC,b.achieved_at ASC LIMIT 50`).all();
  return json({entries:result.results});
}
