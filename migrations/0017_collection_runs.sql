CREATE TABLE IF NOT EXISTS preview_collection_runs (
 id TEXT PRIMARY KEY, league_id TEXT NOT NULL, checked_at TEXT NOT NULL,
 mode TEXT NOT NULL, status TEXT NOT NULL, diagnostics_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS preview_collection_runs_by_league_time ON preview_collection_runs(league_id,checked_at DESC);
