CREATE TABLE IF NOT EXISTS competition_lifecycle (
  competition_id TEXT PRIMARY KEY REFERENCES competitions(id) ON DELETE CASCADE,
  lifecycle_status TEXT NOT NULL DEFAULT 'upcoming' CHECK (lifecycle_status IN ('upcoming','live','completed','archived')),
  updated_by TEXT NOT NULL REFERENCES users(discord_id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_discord_id TEXT NOT NULL REFERENCES users(discord_id),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS admin_messages_recent ON admin_messages(created_at DESC);
