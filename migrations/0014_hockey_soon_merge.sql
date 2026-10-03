-- Apply once only; subsequent runs must not resurrect released assignments.
INSERT INTO league_player_aliases(alias_id,canonical_id,created_by,backup_json) VALUES('1790122602942','1790190860064-579',NULL,'{"keep":{"id":"1790190860064-579","name":"Hockey Soon","memberships":{"6v6":{"profileId":"1790190860064-579","team":"club-1790182556439","metadata":{"id":"1790190860064-579","name":"Hockey Soon","club":"club-1790182556439","number":"","portrait":false}}}},"source":{"id":"1790122602942","name":"Hockey Soon","memberships":{"10v10":{"profileId":"1790122602942","team":"PALA","metadata":{"id":"1790122602942","name":"Hockey Soon","club":"PALA","number":"","portrait":true}}}},"portraits":[],"reason":"Owner-confirmed Hockey Soon duplicate; 2026-10-03"}');
INSERT INTO league_roster_memberships(player_id,season,division,profile_id,team_key,metadata_json,updated_by,updated_at)
   SELECT '1790190860064-579',season,division,profile_id,team_key,metadata_json,updated_by,updated_at FROM league_roster_memberships WHERE player_id='1790122602942'
   ON CONFLICT(player_id,season,division) DO UPDATE SET
    profile_id=CASE WHEN league_roster_memberships.team_key IS NULL AND excluded.team_key IS NOT NULL THEN excluded.profile_id ELSE league_roster_memberships.profile_id END,
    metadata_json=CASE WHEN league_roster_memberships.team_key IS NULL AND excluded.team_key IS NOT NULL THEN excluded.metadata_json ELSE league_roster_memberships.metadata_json END,
    team_key=COALESCE(league_roster_memberships.team_key,excluded.team_key);
UPDATE player_photo_submissions SET identity_id='1790190860064-579' WHERE identity_id='1790122602942';
UPDATE player_photo_retired_assets SET identity_id='1790190860064-579' WHERE identity_id='1790122602942';
INSERT OR IGNORE INTO player_photo_publications(identity_id,submission_id,portrait_key,approved_by,approved_at) SELECT '1790190860064-579',submission_id,portrait_key,approved_by,approved_at FROM player_photo_publications WHERE identity_id='1790122602942';
DELETE FROM player_photo_publications WHERE identity_id='1790122602942';
