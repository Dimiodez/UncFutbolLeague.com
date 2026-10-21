CREATE TABLE IF NOT EXISTS league_suite_access (
 id INTEGER PRIMARY KEY CHECK(id=1), admins_enabled INTEGER NOT NULL DEFAULT 0 CHECK(admins_enabled IN (0,1)),
 updated_by TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO league_suite_access(id,admins_enabled) VALUES(1,0);
