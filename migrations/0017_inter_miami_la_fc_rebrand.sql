-- Owner-confirmed Season 2 6v6 rebrand: Inter Miami -> LA FC.
-- Preserve identities, profile URLs, photos, roles, other metadata,
-- other divisions and historical seasons. Safe to run again.
UPDATE league_roster_memberships
SET team_key = 'LA',
    metadata_json = json_set(metadata_json, '$.club', 'LA'),
    updated_at = CURRENT_TIMESTAMP
WHERE season = '2' AND division = '6v6' AND team_key = 'club-1790814116306';
