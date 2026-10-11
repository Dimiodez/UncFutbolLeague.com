CREATE TABLE IF NOT EXISTS sound_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  playlists TEXT NOT NULL CHECK(json_valid(playlists) AND json_type(playlists) = 'array' AND json_array_length(playlists) <= 5),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Launch empty. Rerunning this migration must never overwrite curated selections.
INSERT OR IGNORE INTO sound_settings(id,playlists) VALUES(1,'[]');
