-- Soft merge: original player and membership rows are retained for recovery.
CREATE TABLE IF NOT EXISTS league_player_aliases (
 alias_id TEXT PRIMARY KEY REFERENCES league_players(id),
 canonical_id TEXT NOT NULL REFERENCES league_players(id),
 created_by TEXT REFERENCES users(discord_id),
 backup_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(alias_id<>canonical_id)
);
CREATE TRIGGER IF NOT EXISTS league_player_merge_conflict
BEFORE INSERT ON league_player_aliases BEGIN
 SELECT CASE WHEN EXISTS(
  SELECT 1 FROM league_roster_memberships a JOIN league_roster_memberships b
  ON a.season=b.season AND a.division=b.division
  WHERE a.player_id=NEW.alias_id AND b.player_id=NEW.canonical_id
  AND a.team_key IS NOT NULL AND b.team_key IS NOT NULL AND a.team_key<>b.team_key
 ) THEN RAISE(ABORT,'Conflicting team assignments; resolve before merging') END;
 SELECT CASE WHEN EXISTS(
  SELECT 1 FROM player_photo_publications a JOIN player_photo_publications b
  ON a.identity_id=NEW.alias_id AND b.identity_id=NEW.canonical_id
  WHERE a.portrait_key<>b.portrait_key
 ) THEN RAISE(ABORT,'Two approved portraits; resolve before merging') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM league_player_aliases WHERE alias_id=NEW.canonical_id OR alias_id=NEW.alias_id OR canonical_id=NEW.alias_id)
 THEN RAISE(ABORT,'Player was already merged; reload first') END;
END;
