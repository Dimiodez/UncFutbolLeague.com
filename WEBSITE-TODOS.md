# Next website session

## Saved handoff — October 8, 2026

- Latest verified live feature release: `04dcb7fde0c187823b2cfce8834da8ee094a757a`. Both house teams now use shared-match team goals for attacking partnerships, require five qualifying matches for defensive/winning rates, disclose incomplete player-detail coverage, retain loaded details for retry, and pace requests with a rate-limit cooldown. Eighteen targeted checks passed. No new partnership awards were added.
- Arcade creator credits are live on all four cards. The bottom invitation opens `/arcade/submit`, with Discord contact `@dimio11`, idea pitches, source submission/review requirements, leaderboard guidance, and beginner Codex/GitHub instructions including commits and pushes. There is no new upload endpoint or automatic publishing workflow.
- Season 2 roster first pass updated 79 memberships using 48 existing identities and six initially new identities; 12 outdated memberships were released to the pool, not deleted. Stable VA user links were saved in production; migration `0019_va_player_links.sql` records the schema. Do not replay the one-time import against an already updated database.
- Owner subsequently confirmed Matt is xdestroy-lonely. The two records were soft-merged into Matt's existing identity `1790190642688`, with display name `xdestroy-lonely` and both existing profile URLs preserved. VA user 70 now links to that identity. The mistaken goalkeeper designation was removed; VA position remains MID for Roma 6v6 and unspecified for Timbers 10v10. Do not create Matt/xdestroy again.
- Seventeen uncertain VA names still need owner confirmation before import/merge: rfpqgold, BravoAnte, zo54, liz4, nb70, Rippy Nolan, Bradical, 77 Days Til Hockey Season, K0zmic kay, H00bear, Hartman, Espahr, mystahdeek, bn95, SamLoscarinho, Cookie Monster, Chip. Do not infer verified Discord identities from VA usernames or gaming handles.
- Private pre-change roster snapshots, reviewed import plans, verification reports and Matt merge backup are saved under `C:/Users/twizz/Documents/New project/` with `UFL-VA-ROSTER-*` and `UFL-MATT-XDESTROY-*` names. Preserve these recovery artifacts; do not publish them. Some reports precede the Matt merge and are historical, not authoritative current state.
- Keep the scoped image permissions already deployed: explicit team managers can submit player photos for staff approval; owners/admins approve player portraits; team logos/stadium images publish directly for authorized managers/staff. No team deletion or further unconfirmed player merges are authorized by this handoff.
- Google dangerous-site/OAuth reputation concerns remain a separate unresolved item. Do not treat successful roster or arcade deployments as confirmation that browser security warnings are resolved.

## Preserve production data on every layout release

- Keep `.github/workflows/sync-virtual-arena.yml` and `scripts/sync-virtual-arena.mjs` active. Scheduled sync runs four times daily; these are published snapshots, not an in-match live feed.
- Preserve official VA links and mappings: UFL Season 2 6v6 uses competition 1 / VA season 2; 10v10 uses competition 3 / VA season 5. Both are UFL Season 2.
- Before publishing, merge the latest master snapshots, retain the Season 1 archive, and verify results, standings, fixtures and Pick'ems against the official feeds. Do not overwrite newer VA data with clone snapshots.
- Preserve production authentication, database bindings, saved predictions, FUNC creations and arcade records. Do not migrate or clear user data for a visual release.

## Next features

- October 3, 2026: owner supplied the replacement 10v10 feed, competition 3 / season 5. Keep the UFL Season 2 identity and existing saved picks; external provider IDs are not UFL season numbers.

- Add secure player membership management: stable player identities, season/division assignments, reassignment and an unassigned free-agent pool. Removing a player from a club must not delete the player.
- Extend directory search/filtering to club and unassigned players. Define which users can request changes and which captains/admins approve them; enforce permissions on the server.
- Add admin captain selection (2–3 captains per club). Roma currently has Dez / DimiOdez and Gabe / bRzGabriel98. Keep featured-club captain portraits tied to roster membership.
- Map provisional clubs to official VA registrations as they arrive, without duplicate directory entries or losing artwork/rosters.
- Connect verified individual match stats and awards, then Team of the Week; no invented leaderboards while pending.
- Add an admin weekly featured-club override. Maintain alternating 6v6/10v10 slots and independent no-repeat cycles.
- Optimize the largest crest images and check all three themes, mobile menus, accessibility and public link thumbnails.

## Community-first UFL league platform requirements

- Connect the website and Discord bot to one authoritative UFL backend/database. Approved website changes must appear in bot command results, and authorized bot changes must appear on the website. Share permission checks, one-team-per-league constraints, captain roles and an audit trail. Map Discord users, permanent player IDs and EA club/account records explicitly; make repeated bot requests safe and define website refresh/invalidation behavior. Avoid separate roster stores that can drift. This integration is planned, not currently enabled.

- Purpose: serve UNC league members, not sell a multi-tenant league-management service. Registration, team linking and concurrent UFL competitions must not depend on paid tiers. Optional Patreon or merch is distant-future support, not a participation requirement.
- One permanent player identity, with separate memberships for each league/division and season. A player may belong to one active 6v6 team and one active 10v10 team simultaneously, but never two active teams in the same competition. Enforce this constraint server-side and transactionally, not just in the UI.
- Support player signup, team invitations/requests and authorized roster approval. Define who can approve transfers; retain membership history and match records. Removing a membership returns the player to that competition's unassigned pool without deleting their identity or other league membership.
- Discord sign-in identifies the website member; EA/platform handles and club links are separate records. Do not claim that a supplied handle verifies EA account ownership.
- Use stable UFL season/competition IDs and shareable routes independent of upstream VA IDs. External provider mappings may change without resetting rosters, registration, standings archives or saved picks.
- Concurrent leagues should operate independently. One unavailable external feed must not stop another competition from refreshing. Retain last-good data, display freshness, and surface actionable admin sync errors.
- VA replacement is a staged future build, not included in the published layout. Keep provider mappings separate from stable UFL identities so upstream URL changes do not reset registrations or league history.

## Release record

Previous production source for rollback: `efc9aebc0e63ceccfd44c599740129661d0e8c6a`. Release brings in its latest VA snapshots before promoting the navigation branch. 28 relevant automated checks pass; successful sixes refresh was run, while tens retained its last good snapshot after official VA HTTP 404 responses.

The navigation-remap branch is approved for production on 2026-10-02. Home includes the weekly club spotlight starting with Roma. League has Clubs, Players, Schedules, Standings and Stats; cups/BYOT remain within Schedules. Dark is the default unless a visitor has a saved preference.
