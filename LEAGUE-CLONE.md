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

The 26-player reference directory is only a partial Season 1 6v6 snapshot. It is labelled accordingly and must not be used as a current registration database. Season 2 now includes the collaborator’s provisional 6v6 roster (9 clubs, 51 players) and first 10v10 roster (7 clubs, 65 players). His selector labels tens Season 01; it maps to UFL Season 2. Each division is a separate membership set in `league-season2.js`. Only explicit known VA club aliases are mapped (Roma/Toluca and Newell’s/Timbers); no player accounts are linked. Standings remain the committed official VA snapshot, not fabricated zero-point rows for provisional teams. Some portraits are unavailable on the source and use a neutral fallback. The full portal currently exposes only its Season 01 dataset, so it remains a stats-layout reference, not the current-roster source.

The club crest uses a lifted circular bubble on hover and keyboard focus, with site-theme colours and reduced-motion support.

## Later integration

Keep club IDs, season membership, roster membership and EA account identity separate. Add a verified server-side Clubs data adapter later. This preview performs no EA requests, Discord registration changes or write to the collaborator’s portal.

## Verification

`node --test scripts/league-pages.test.mjs`

Local preview: `node dev-server.mjs` at port 4173.
# Weekly homepage club spotlight

The homepage reuses current-season club artwork and roster records. Rotation starts with Roma for the week of September 28, 2026 and changes on Monday at 00:00 UTC, covering each 6v6 and 10v10 club once per cycle. No recurring job or visitor-specific storage is needed. Roma's confirmed captains are Dez (DimiOdez) and Gabe (bRzGabriel98), linked to existing player IDs. Clubs without assigned captains show squad members without claiming they are captains.

Results and club totals use the committed season snapshot. Zero-game tables are not presented as competitive rankings; individual player stats and new fixtures remain pending until connected. Captain metadata is presently maintained in source, not an admin editor.

Future roster management must retain permanent player identities separately from season/division membership. Removing a membership must not delete a player: the player becomes unassigned in that competition. Search and filters should cover all players, clubs and unassigned free agents. Membership and captain writes must enforce server-side admin/captain permissions, with a maximum of three captains per club. No self-service reassignment or administrative roster backend has been enabled in this preview.

