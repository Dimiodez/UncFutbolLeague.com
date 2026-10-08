-- Owner-confirmed Season 2 6v6 rebrand: Palermo -> Italia.
-- Update the existing memberships in place; preserve identities, profile URLs,
-- photos, roles, other metadata, all other teams and historical seasons.
-- Idempotent: running again cannot overwrite later assignments.
UPDATE league_roster_memberships
SET team_key = 'ITA',
    metadata_json = json_set(metadata_json, '$.club', 'ITA'),
    updated_at = CURRENT_TIMESTAMP
WHERE season = '2' AND division = '6v6' AND team_key = 'club-1790181832909';
