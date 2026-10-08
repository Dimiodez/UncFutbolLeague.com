-- Image permissions are explicit, division-specific grants, not display titles.
CREATE TABLE IF NOT EXISTS team_media_managers (
 discord_id TEXT NOT NULL REFERENCES users(discord_id),
 season TEXT NOT NULL CHECK(season='2'),
 division TEXT NOT NULL CHECK(division IN ('6v6','10v10')),
 team_key TEXT NOT NULL,
 assigned_by TEXT NOT NULL REFERENCES users(discord_id),
 PRIMARY KEY(discord_id,season,division,team_key)
);
CREATE TABLE IF NOT EXISTS team_media_assets (
 id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, content_type TEXT NOT NULL,
 uploaded_by TEXT NOT NULL REFERENCES users(discord_id),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS team_media_publications (
 season TEXT NOT NULL CHECK(season='2'),
 division TEXT NOT NULL CHECK(division IN ('6v6','10v10')),
 team_key TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('logo','stadium')),
 asset_id TEXT NOT NULL REFERENCES team_media_assets(id),
 PRIMARY KEY(season,division,team_key,kind)
);
-- The current manager title is unambiguous: Roma exists only in 6v6.
-- Carry that staff-assigned appointment into the new scoped permission once.
INSERT OR IGNORE INTO team_media_managers(discord_id,season,division,team_key,assigned_by)
SELECT discord_id,'2','6v6','ROM',assigned_by FROM member_titles
WHERE title='manager' AND team_name='UFL Roma';
