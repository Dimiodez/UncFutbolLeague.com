CREATE TABLE IF NOT EXISTS func_layout_masters (
  template_key TEXT PRIMARY KEY,
  draft_json TEXT,
  published_json TEXT,
  published_version INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL REFERENCES users(discord_id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS func_layout_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  published_by TEXT NOT NULL REFERENCES users(discord_id),
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_key, version)
);

CREATE INDEX IF NOT EXISTS func_layout_history_by_template
  ON func_layout_history(template_key, version DESC);
