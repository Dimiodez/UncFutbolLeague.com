-- Same idempotent schema initialized by the authenticated team registration API.
CREATE TABLE IF NOT EXISTS member_teams(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,manager_id TEXT NOT NULL REFERENCES users(discord_id),created_by TEXT NOT NULL,ea_club_id TEXT,ea_club_name TEXT,ea_verified_at TEXT,revision INTEGER NOT NULL DEFAULT 1,last_write TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX IF NOT EXISTS member_team_club ON member_teams(ea_club_id) WHERE ea_club_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS member_team_leagues(id TEXT PRIMARY KEY,name TEXT NOT NULL,season TEXT NOT NULL,format TEXT NOT NULL,is_open INTEGER NOT NULL DEFAULT 0,registration_settings TEXT NOT NULL,updated_by TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS member_team_applications(team_id TEXT NOT NULL REFERENCES member_teams(id),league_id TEXT NOT NULL REFERENCES member_team_leagues(id),ea_club_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')),revision INTEGER NOT NULL DEFAULT 1,last_write TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(team_id,league_id));

CREATE UNIQUE INDEX IF NOT EXISTS member_application_club ON member_team_applications(league_id,ea_club_id) WHERE status IN ('pending','approved');

CREATE TABLE IF NOT EXISTS member_team_hubs(team_id TEXT PRIMARY KEY REFERENCES member_teams(id),payload TEXT NOT NULL DEFAULT '{"version":1,"boards":[]}',revision INTEGER NOT NULL DEFAULT 0,created_by TEXT NOT NULL,updated_by TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS member_team_audit(id TEXT PRIMARY KEY,team_id TEXT,actor TEXT NOT NULL,action TEXT NOT NULL,before_json TEXT,after_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
