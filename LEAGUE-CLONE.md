# League presentation preview — 2 October 2026

Clone branch: `codex/ufl-navigation-remap`. Do not merge into production until approved.

## Routes

- `/clubs` (also `/teams`): season/division club directory, artwork and internal club profiles.
- `/players`: searchable directory, club filters and individual player pages.
- `/standings`: existing committed Virtual Arena tables, archived champions panel and future honours slots.
- `/stats`: award-watch cards and Goals, Assists, G+A, Tackles per game, Defender clean sheets and Average rating leaderboards.

All four preserve `season=1|2` and `division=6v6|10v10` between links. House teams remain available from Clubs.

## Reference material

Layout and public artwork/portraits adapted from the collaborating league admin’s `https://ufl-simple-site.web.app/` (Clubs, Players, Standings), viewed 2 October 2026. Stats categories follow `https://unc-futbol-league.web.app/stats`. Assets are local under `assets/league/`; there is no dependency on either Firebase site at runtime. Pumas artwork is resized for delivery.

The 26-player reference directory is only a partial Season 1 6v6 snapshot. It is labelled accordingly and must not be used as a current registration database. Season 2 uses the existing official team snapshot; no old players are carried over. Match stats and unconfirmed individual awards are explicitly pending, not fabricated.

## Later integration

Keep club IDs, season membership, roster membership and EA account identity separate. Add a verified server-side Clubs data adapter later. This preview performs no EA requests, Discord registration changes or write to the collaborator’s portal.

## Verification

`node --test scripts/league-pages.test.mjs`

Local preview: `node dev-server.mjs` at port 4173.
