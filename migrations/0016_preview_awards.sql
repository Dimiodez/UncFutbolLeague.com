CREATE TABLE IF NOT EXISTS preview_award_publications (
 id TEXT PRIMARY KEY, revision INTEGER NOT NULL, snapshot TEXT NOT NULL,
 published_at TEXT NOT NULL DEFAULT (datetime('now')), published_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS preview_award_revisions (
 publication_id TEXT NOT NULL, revision INTEGER NOT NULL, snapshot TEXT NOT NULL,
 published_at TEXT NOT NULL DEFAULT (datetime('now')), published_by TEXT NOT NULL,
 PRIMARY KEY(publication_id, revision)
);
