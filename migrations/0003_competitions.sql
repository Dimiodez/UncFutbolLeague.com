CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  destination TEXT NOT NULL CHECK (destination IN ('community-events', 'league-cup')),
  format TEXT NOT NULL,
  starts_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  snapshot_json TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(discord_id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS competitions_by_destination ON competitions(destination, status, starts_at);
