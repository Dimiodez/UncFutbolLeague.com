-- International memberships are separate from club/division memberships.
CREATE TABLE IF NOT EXISTS international_competitions (
 id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'league' CHECK(kind IN ('league','cup','tournament')),parent_id TEXT REFERENCES international_competitions(id),match_min INTEGER NOT NULL DEFAULT 5,match_max INTEGER NOT NULL DEFAULT 6,
 human_keepers INTEGER NOT NULL DEFAULT 0,shared_league_id TEXT,publish_results INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS international_teams (
 competition_id TEXT NOT NULL REFERENCES international_competitions(id),id TEXT NOT NULL,name TEXT NOT NULL,flag TEXT NOT NULL,color TEXT NOT NULL,
 ea_club_id TEXT,PRIMARY KEY(competition_id,id)
);
CREATE TABLE IF NOT EXISTS international_rosters (
 id TEXT PRIMARY KEY,competition_id TEXT NOT NULL,team_id TEXT NOT NULL,player_id TEXT REFERENCES league_players(id),
 display_name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,updated_by TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(competition_id,team_id) REFERENCES international_teams(competition_id,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS international_one_country ON international_rosters(competition_id,player_id) WHERE active=1 AND player_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS international_roster_name ON international_rosters(competition_id,team_id,lower(display_name)) WHERE active=1;
CREATE TABLE IF NOT EXISTS international_windows (
 id TEXT PRIMARY KEY,competition_id TEXT NOT NULL REFERENCES international_competitions(id),name TEXT NOT NULL,starts_on TEXT NOT NULL,ends_on TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS international_selections (
 id TEXT PRIMARY KEY,competition_id TEXT NOT NULL REFERENCES international_competitions(id),title TEXT NOT NULL,period_label TEXT NOT NULL,
 payload_json TEXT NOT NULL DEFAULT '[]',published INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS international_roster_audit (
 id TEXT PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,roster_id TEXT NOT NULL,detail_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS international_unique_club ON international_teams(competition_id,ea_club_id) WHERE ea_club_id IS NOT NULL;
