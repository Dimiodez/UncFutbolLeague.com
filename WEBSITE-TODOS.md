# Next website session

## Preserve production data on every layout release

- Keep `.github/workflows/sync-virtual-arena.yml` and `scripts/sync-virtual-arena.mjs` active. Scheduled sync runs four times daily; these are published snapshots, not an in-match live feed.
- Preserve official VA links and mappings: UFL Season 2 6v6 uses competition 1 / VA season 2; 10v10 uses competition 2 / VA season 4. Both are UFL Season 2.
- Before publishing, merge the latest master snapshots, retain the Season 1 archive, and verify results, standings, fixtures and Pick'ems against the official feeds. Do not overwrite newer VA data with clone snapshots.
- Preserve production authentication, database bindings, saved predictions, FUNC creations and arcade records. Do not migrate or clear user data for a visual release.

## Next features

- URGENT: On release day, VA competition 2 / season 4 matches, standings and stats return HTTP 404. Confirm the official 10v10 season URLs with the league/VA administrator. Do not guess a replacement season. Last good tens data is retained while sixes can refresh independently; GitHub sync emits a warning for unavailable feeds.

- Add secure player membership management: stable player identities, season/division assignments, reassignment and an unassigned free-agent pool. Removing a player from a club must not delete the player.
- Extend directory search/filtering to club and unassigned players. Define which users can request changes and which captains/admins approve them; enforce permissions on the server.
- Add admin captain selection (2–3 captains per club). Roma currently has Dez / DimiOdez and Gabe / bRzGabriel98. Keep featured-club captain portraits tied to roster membership.
- Map provisional clubs to official VA registrations as they arrive, without duplicate directory entries or losing artwork/rosters.
- Connect verified individual match stats and awards, then Team of the Week; no invented leaderboards while pending.
- Add an admin weekly featured-club override. Maintain alternating 6v6/10v10 slots and independent no-repeat cycles.
- Optimize the largest crest images and check all three themes, mobile menus, accessibility and public link thumbnails.

## Release record

Previous production source for rollback: `efc9aebc0e63ceccfd44c599740129661d0e8c6a`. Release brings in its latest VA snapshots before promoting the navigation branch. 28 relevant automated checks pass; successful sixes refresh was run, while tens retained its last good snapshot after official VA HTTP 404 responses.

The navigation-remap branch is approved for production on 2026-10-02. Home includes the weekly club spotlight starting with Roma. League has Clubs, Players, Schedules, Standings and Stats; cups/BYOT remain within Schedules. Dark is the default unless a visitor has a saved preference.
