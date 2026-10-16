CREATE TABLE IF NOT EXISTS preview_league_results (
 id TEXT PRIMARY KEY, draft_json TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 enabled INTEGER NOT NULL DEFAULT 1, checked_at TEXT, succeeded_at TEXT, health TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS preview_ea_match_archive (
 league_id TEXT NOT NULL, match_id TEXT NOT NULL, game_json TEXT NOT NULL,
 captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(league_id,match_id)
);
CREATE TABLE IF NOT EXISTS preview_result_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, league_id TEXT NOT NULL, fixture_id TEXT,
 actor TEXT NOT NULL, reason TEXT NOT NULL, before_json TEXT, after_json TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
