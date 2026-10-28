CREATE TABLE IF NOT EXISTS preview_ea_match_observations (
 league_id TEXT NOT NULL,
 match_id TEXT NOT NULL,
 payload_hash TEXT NOT NULL,
 game_json TEXT NOT NULL,
 observed_at TEXT NOT NULL,
 PRIMARY KEY (league_id, match_id, payload_hash)
);
