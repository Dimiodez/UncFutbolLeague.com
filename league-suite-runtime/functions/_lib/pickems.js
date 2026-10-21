export const PICKEM_COMPETITIONS = new Set(['s1-6v6', 's2-6v6', 's2-10v10']);

export function validPickemCompetition(value) {
  const key = typeof value === 'string' && value ? value : 's2-6v6';
  return PICKEM_COMPETITIONS.has(key) ? key : null;
}

export async function syncPickemMatchesFromAsset(request, env, competition) {
  const seasonAsset = competition === 's1-6v6' ? '/pickems-app/seasons/s1-6v6.json' : `/pickems-app/seasons/${competition}.json`;
  const response = await env.ASSETS.fetch(new URL(seasonAsset, request.url));
  if (!response.ok) return { available: false, matches: 0 };
  const season = await response.json();
  const matches = (season.weeks || []).flatMap(week => (week.matches || []).map(([id, home, away, homeScore, awayScore]) => ({
    id: Number(id),
    week: Number(week.week),
    scheduledAt: Number(week.scheduledAt),
    home,
    away,
    homeScore,
    awayScore
  }))).filter(match => Number.isInteger(match.id) && match.id > 0 && Number.isInteger(match.week) && match.week > 0 && Number.isFinite(match.scheduledAt));
  if (matches.length) await env.DB.batch(matches.map(match => env.DB.prepare(`
    INSERT INTO pickem_matches (id,week,scheduled_at,home_key,away_key,home_score,away_score,competition_key)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET week=excluded.week,scheduled_at=excluded.scheduled_at,home_key=excluded.home_key,
      away_key=excluded.away_key,home_score=excluded.home_score,away_score=excluded.away_score,
      competition_key=excluded.competition_key,updated_at=CURRENT_TIMESTAMP
  `).bind(match.id, match.week, match.scheduledAt, match.home, match.away, match.homeScore, match.awayScore, competition)));
  return { available: true, matches: matches.length };
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
