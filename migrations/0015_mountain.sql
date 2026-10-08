CREATE TABLE IF NOT EXISTS mountain_runs (
  id TEXT PRIMARY KEY, discord_id TEXT NOT NULL, version TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0, stats TEXT NOT NULL DEFAULT '{}',
  started_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  finished INTEGER NOT NULL DEFAULT 0, commit_token TEXT
);
CREATE TABLE IF NOT EXISTS mountain_bests (
  discord_id TEXT NOT NULL, version TEXT NOT NULL,
  activePlayMs INTEGER NOT NULL, totalDeaths INTEGER NOT NULL,
  ballsTakenToFace INTEGER NOT NULL, salmonStrikes INTEGER NOT NULL,
  bruceSockKnocks INTEGER NOT NULL, bizzieInterruptions INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL, PRIMARY KEY(discord_id,version)
);
