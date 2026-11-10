CREATE TABLE IF NOT EXISTS team_banner_publications (
 season TEXT NOT NULL CHECK(season='2'), division TEXT NOT NULL CHECK(division IN ('6v6','10v10')),
 team_key TEXT NOT NULL, asset_id TEXT NOT NULL REFERENCES team_media_assets(id),
 PRIMARY KEY(season,division,team_key)
);
