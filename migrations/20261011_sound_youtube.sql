-- Preview only. Prepend the requested test selection, preserving existing playlists.
UPDATE preview_sound_settings
SET playlists = json_insert(playlists, '$[#]', json('{"title":"YouTube test selection","description":"Testing full-track playback with the playlist shared by Dimiodez. The FCFA playlist is coming later.","url":"https://www.youtube.com/playlist?list=OLAK5uy_mi3B8_JLj-ehEm2O6l6qKQWUoHqzPClBk"}')),
revision = revision + 1, updated_at = datetime('now')
WHERE id = 1 AND json_array_length(playlists) < 5
AND NOT EXISTS (SELECT 1 FROM json_each(playlists) WHERE json_extract(value,'$.url') LIKE '%OLAK5uy_mi3B8_JLj-ehEm2O6l6qKQWUoHqzPClBk%');
-- Put YouTube first without deleting or replacing the existing Spotify selection.
UPDATE preview_sound_settings
SET revision = revision + 1, playlists = (
  SELECT json_group_array(json(value)) FROM (
    SELECT value FROM json_each(preview_sound_settings.playlists)
    ORDER BY CASE WHEN json_extract(value,'$.url') LIKE '%OLAK5uy_mi3B8_JLj-ehEm2O6l6qKQWUoHqzPClBk%' THEN 0 ELSE 1 END, key
  )
)
WHERE id = 1;
