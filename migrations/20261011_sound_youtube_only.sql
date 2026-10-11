-- Remove only the retired Spotify selection(s); retain YouTube entries and their order.
UPDATE preview_sound_settings
SET playlists = (
  SELECT json_group_array(json(value)) FROM (
    SELECT value FROM json_each(preview_sound_settings.playlists)
    WHERE json_extract(value,'$.url') NOT LIKE 'https://open.spotify.com/%'
    ORDER BY key
  )
), revision = revision + 1, updated_at = datetime('now')
WHERE id = 1 AND EXISTS (
  SELECT 1 FROM json_each(playlists)
  WHERE json_extract(value,'$.url') LIKE 'https://open.spotify.com/%'
);
