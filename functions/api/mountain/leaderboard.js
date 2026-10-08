import { json } from '../../_lib/auth.js';
import { ensureMountain, VERSION, STAT_KEYS } from '../../_lib/mountain.js';
export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: 'Leaderboard unavailable.' }, 503);
  await ensureMountain(env);
  const result = await env.DB.prepare(`SELECT u.display_name AS displayName,${STAT_KEYS.map(key => `b.${key}`).join(',')}
    FROM mountain_bests b JOIN users u ON u.discord_id=b.discord_id AND u.status='active'
    WHERE b.version=? ORDER BY b.activePlayMs ASC,b.totalDeaths ASC,b.achieved_at ASC LIMIT 50`).bind(VERSION).all();
  return json({ entries: result.results });
}
