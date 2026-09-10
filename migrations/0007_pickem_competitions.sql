ALTER TABLE pickem_matches ADD COLUMN competition_key TEXT NOT NULL DEFAULT 's1-6v6';

CREATE INDEX IF NOT EXISTS pickem_matches_by_competition_week
  ON pickem_matches(competition_key, week);

CREATE TABLE IF NOT EXISTS pickem_tiebreakers_v2 (
  discord_id TEXT NOT NULL REFERENCES users(discord_id) ON DELETE CASCADE,
  competition_key TEXT NOT NULL,
  week INTEGER NOT NULL,
  goals INTEGER NOT NULL CHECK (goals BETWEEN 0 AND 99),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (discord_id, competition_key, week)
);

INSERT OR IGNORE INTO pickem_tiebreakers_v2
  (discord_id, competition_key, week, goals, created_at, updated_at)
SELECT discord_id, 's1-6v6', week, goals, created_at, updated_at
FROM pickem_tiebreakers;
