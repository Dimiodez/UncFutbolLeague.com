CREATE TABLE IF NOT EXISTS preview_sound_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  revision INTEGER NOT NULL DEFAULT 0,
  playlists TEXT NOT NULL CHECK(json_valid(playlists) AND json_type(playlists) = 'array' AND json_array_length(playlists) <= 5),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO preview_sound_settings(id,playlists) VALUES(1,
  '[{"title":"The warm-up selection","description":"Temporary test playlist. The community-built FCFA selection is coming later.","url":"https://open.spotify.com/playlist/6iqa4OoxhBFrEBXAxul9cG"}]');
