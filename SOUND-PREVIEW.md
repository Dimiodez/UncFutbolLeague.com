# Sound preview — October 11, 2026

## Current decision: YouTube only

Spotify support and its test selection have been retired at the user's request. Sound accepts up to five YouTube playlists or albums total, including YouTube Music album Share links represented as `/playlist?list=OLAK…`. Only owner/admin can manage selections. `20261011_sound_youtube_only.sql` removes Spotify entries without deleting/reordering remaining YouTube selections, and is safe to rerun. Public UI, iframe code and CSP no longer include Spotify. Earlier sections below record historical development, not current provider support.

## YouTube test update

- Accepts HTTPS Spotify, YouTube and YouTube Music playlist links, canonicalized server-side; five playlists total across both providers. Provider and playlist ID are derived from the validated URL, not trusted from client input.
- Requested YouTube playlist `OLAK5uy_mi3B8_JLj-ehEm2O6l6qKQWUoHqzPClBk` appears first; the prior Spotify selection remains available separately. Seed migration preserves other selections and avoids duplicates.
- YouTube uses the visible, click-to-load privacy-enhanced player at `www.youtube-nocookie.com`, with an explicit strict-origin-when-cross-origin Referer policy. No autoplay, hidden audio-only player, account collection or ad blocking.
- Embedding/region/age restrictions and ads are controlled by YouTube; verify this specific playlist before promising full playback. Owner/admin and CSRF checks unchanged.
- Browser verification: requested playlist resolved to “No Big Deal” by Dimio; player exposed a 189.661-second duration and progressing playback with no media error. This verifies the tested track/session, not every track, region or account.

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
