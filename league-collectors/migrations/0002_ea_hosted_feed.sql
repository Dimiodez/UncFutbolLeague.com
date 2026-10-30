CREATE TABLE IF NOT EXISTS preview_ea_feed_cache (
 club_id TEXT NOT NULL,
 match_type TEXT NOT NULL CHECK(match_type='friendly'),
 body_json TEXT NOT NULL,
 checked_at TEXT NOT NULL,
 PRIMARY KEY(club_id,match_type)
);
