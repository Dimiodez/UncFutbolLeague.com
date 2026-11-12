-- Separate from national roster edits: linking a club never changes a player.
CREATE TABLE IF NOT EXISTS international_team_link_audit (
 id TEXT PRIMARY KEY,
 competition_id TEXT NOT NULL,
 team_id TEXT NOT NULL,
 actor TEXT NOT NULL,
 detail_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(competition_id,team_id) REFERENCES international_teams(competition_id,id)
);
