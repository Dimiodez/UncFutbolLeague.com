# Sound preview — October 11, 2026

Preview only: `/sound`, linked from Fun. Production website and bot are unchanged.

- Temporary playlist: `6iqa4OoxhBFrEBXAxul9cG`; not the upcoming FCFA playlist.
- Existing preview Discord authentication; owner/admin only. Managers and players cannot save.
- POST `/api/sound`: exact-origin check, authenticated active role, bounded JSON, Spotify playlist URL allowlist, maximum five unique playlists. Atomic revision compare-and-swap prevents lost edits. Database check also enforces the five-playlist cap.
- Only title, description, canonical link, order, revision and editor ID stored. No Spotify credentials, audio uploads or API key.
- Official Spotify iframe is created on click only; no autoplay or music integration into arcade games. Spotify controls account, browser, preview and advertising behavior. “Open in Spotify” remains available.
- Narrow CSP iframe allowance for `https://open.spotify.com`; other security controls retained.
- Migration `migrations/20261011_sound.sql` is idempotent, seeds the temporary playlist once, and targets only preview D1 `6f0ee529-d74f-443f-9165-ffb746d210f1`.
- Tests: `node scripts/sound.test.mjs`.
- Publish with `scripts/publish-preview.ps1`, which stages only public assets and bundles the Worker. Internal notes/configs/backend source are excluded; the preview Worker also blocks internal-file paths. Do not deploy this repository root directly.

Before production promotion: obtain user approval, port just Sound changes to the latest live source (do not replace production with this older preview clone), use production authentication, add production migration deliberately, remove test labels and replace the temporary playlist if requested. Test Spotify playback with real Free/Premium accounts; full-length playback and ad presentation are not guaranteed by this page.
