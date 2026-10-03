CREATE TABLE IF NOT EXISTS player_photo_submissions (
 id TEXT PRIMARY KEY, player_id TEXT NOT NULL, identity_id TEXT NOT NULL,
 original_key TEXT NOT NULL, original_type TEXT NOT NULL,
 uploaded_by TEXT NOT NULL REFERENCES users(discord_id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 portrait_key TEXT, reviewed_by TEXT REFERENCES users(discord_id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS player_photos_identity ON player_photo_submissions(identity_id,created_at);
CREATE TABLE IF NOT EXISTS player_photo_publications (
 identity_id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES player_photo_submissions(id),
 portrait_key TEXT NOT NULL, approved_by TEXT NOT NULL REFERENCES users(discord_id),
 approved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
