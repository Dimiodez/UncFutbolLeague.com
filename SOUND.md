# Sound launch

Live route `/sound`, under Fun. Launches with zero selections and a Coming soon badge. Only active owner/admin accounts can save up to five YouTube playlists or album Share links, including `music.youtube.com/playlist?list=OLAK…`. Spotify links are rejected. YouTube players are visible, click-to-load, privacy-enhanced, non-autoplay, with provider fallback links. Existing Discord authentication and API middleware are reused. No music passwords, API keys or audio storage.

Apply `migrations/20261011_sound.sql` to the existing production D1 deliberately before deploying. It creates only `sound_settings` and seeds an empty list once; reruns do not overwrite selections. Preview data/test playlists must not be copied. The frontend automatically hides the page badge once selections exist; navigation Coming soon labels can be removed when launching the first playlist.

Build with `node scripts/build-public.mjs`; publication allowlist includes only Sound browser resources, never this document or migrations/backend source. Preserve production bindings and all existing routes. Validation: `node --test scripts/*.test.mjs mountain-app/tests/*.test.mjs`, `node scripts/check-ufb.mjs`.
