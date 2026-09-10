export const PICKEM_COMPETITIONS = new Set(['s1-6v6', 's2-6v6', 's2-10v10']);

export function validPickemCompetition(value) {
  const key = typeof value === 'string' && value ? value : 's1-6v6';
  return PICKEM_COMPETITIONS.has(key) ? key : null;
}

export async function ensurePickemCompetitionSchema(env) {
  const columns = await env.DB.prepare('PRAGMA table_info(pickem_matches)').all();
  if (!columns.results.some(column => column.name === 'competition_key')) {
    try {
      await env.DB.prepare("ALTER TABLE pickem_matches ADD COLUMN competition_key TEXT NOT NULL DEFAULT 's1-6v6'").run();
    } catch (error) {
      const refreshed = await env.DB.prepare('PRAGMA table_info(pickem_matches)').all();
      if (!refreshed.results.some(column => column.name === 'competition_key')) throw error;
    }
  }
  await env.DB.batch([
    env.DB.prepare('CREATE INDEX IF NOT EXISTS pickem_matches_by_competition_week ON pickem_matches(competition_key, week)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS pickem_tiebreakers_v2 (
      discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
      competition_key TEXT NOT NULL,
      week INTEGER NOT NULL,
      goals INTEGER NOT NULL CHECK (goals BETWEEN 0 AND 99),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (discord_id, competition_key, week)
    )`),
    env.DB.prepare(`INSERT OR IGNORE INTO pickem_tiebreakers_v2
      (discord_id,competition_key,week,goals,created_at,updated_at)
      SELECT discord_id,'s1-6v6',week,goals,created_at,updated_at FROM pickem_tiebreakers`)
  ]);
}
