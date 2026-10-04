CREATE TABLE IF NOT EXISTS preview_ea_clubs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 discord_id TEXT NOT NULL REFERENCES users(discord_id),
 club_id TEXT NOT NULL,
 club_name TEXT NOT NULL,
 platform TEXT NOT NULL DEFAULT 'common-gen5',
 linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(discord_id,club_id,platform)
);
