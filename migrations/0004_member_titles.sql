CREATE TABLE IF NOT EXISTS member_titles (
  discord_id TEXT PRIMARY KEY REFERENCES users(discord_id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (title IN ('captain', 'manager')),
  team_name TEXT NOT NULL,
  assigned_by TEXT NOT NULL REFERENCES users(discord_id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
