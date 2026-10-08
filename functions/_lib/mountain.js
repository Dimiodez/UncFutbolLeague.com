export const VERSION = 'mountain-1';
export const STAT_KEYS = ['activePlayMs', 'totalDeaths', 'ballsTakenToFace', 'salmonStrikes', 'bruceSockKnocks', 'bizzieInterruptions'];
export const TABLES = [
  `CREATE TABLE IF NOT EXISTS mountain_runs (id TEXT PRIMARY KEY, discord_id TEXT NOT NULL, version TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 0, stats TEXT NOT NULL DEFAULT '{}', started_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, finished INTEGER NOT NULL DEFAULT 0, commit_token TEXT)`,
  `CREATE TABLE IF NOT EXISTS mountain_bests (discord_id TEXT NOT NULL, version TEXT NOT NULL, activePlayMs INTEGER NOT NULL, totalDeaths INTEGER NOT NULL, ballsTakenToFace INTEGER NOT NULL, salmonStrikes INTEGER NOT NULL, bruceSockKnocks INTEGER NOT NULL, bizzieInterruptions INTEGER NOT NULL, achieved_at INTEGER NOT NULL, PRIMARY KEY(discord_id,version))`,
];
export async function ensureMountain(env) {
  await env.DB.batch(TABLES.map(sql => env.DB.prepare(sql)));
}

// Authenticated sequential summit checkpoints and bounded monotonic totals.
// This is casual ranking validation, not a replay of Phaser collisions.
export function validateCheckpoint(body, run, now) {
  if (!Number.isInteger(body.level) || body.level !== run.level + 1 || body.level > 10) throw Error('Invalid level order');
  const previous = JSON.parse(run.stats);
  const stats = Object.fromEntries(STAT_KEYS.map(key => [key, body.stats?.[key]]));
  for (const key of STAT_KEYS) {
    const value = stats[key];
    const maximum = key === 'activePlayMs' ? 86400000 : 100000;
    if (!Number.isSafeInteger(value) || value < (previous[key] || 0) || value > maximum) throw Error('Invalid totals');
  }
  if (stats.activePlayMs > (now - run.started_at + 5) * 1000
    || stats.activePlayMs - (previous.activePlayMs || 0) < 4000
    || stats.ballsTakenToFace > stats.totalDeaths) throw Error('Invalid timing or deaths');
  return stats;
}
