-- Stable external identity mapping prevents repeated VA imports creating new players.
-- VA names are not verified Discord account identities.
CREATE TABLE IF NOT EXISTS league_va_player_links (
 va_user_id INTEGER PRIMARY KEY CHECK(va_user_id>0),
 player_id TEXT NOT NULL UNIQUE REFERENCES league_players(id),
 va_name TEXT NOT NULL,
 linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
