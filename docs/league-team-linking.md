# EA team search and linking

League Suite offers two related setup paths:

- A league's **Teams & registration → Link teams to EA clubs** searches by in-game name and places **Link** beside each result. The registration form can also verify a selection before the new team is registered.
- **Internationals · Team links & migration setup** in the creation hub prepares the existing national competition. Country links save online in the primary website database, without creating a duplicate international league.

Search uses the existing common-gen5 platform, tries EA directly and then the established relay. Provider failures remain errors, not empty successful responses. Results display the EA name and numeric ID; no fuzzy match automatically links a team. Link rechecks the chosen ID against EA before saving. A verified lookup does not establish ownership or grant team/manager permissions.

## Storage and authorization

All routes remain behind the existing League Suite access gate. Linking requires an owner/admin session, a same-origin POST and a per-actor rate limit. Existing administrator access settings remain unchanged.

- `GET /api/league-suite/ea/search?name=...`: normalized EA results.
- `POST /api/league-suite/ea/verify`: `{club:{id,name,platform}}`; verifies a draft selection without writing a personal or shared club link.
- `POST /api/league-suite/ea/team-link`: `{leagueId,teamId,revision,club}`; updates the exact saved League Suite team. Optimistic revision checks prevent the collector or another staff member's work from being overwritten. The full existing draft, accepted/pending results and history remain intact. `teamLinkAudit` records the actor, timestamp and before/after IDs in the same atomic row update.
- `GET /api/league-suite/international-setup`: existing national teams, linked IDs and current publication source.
- `POST /api/league-suite/international-setup`: `{teamId,expectedClubId,club}`; verifies and saves an existing country's EA ID. Compare-and-swap plus the existing unique national club index protect concurrent changes and duplicates. `international_team_link_audit` records these changes separately from player roster edits. The additive table is created idempotently on the first authorized verified change; `migrations/20261112_international_team_links.sql` provides the equivalent managed migration.

New local league drafts persist the selected ID and lookup metadata on this device and in existing explicit account backups. Existing shared collection leagues save the link online immediately. The existing collector reads the same `settings.teams[].eaClubId`; linking never enables a disabled collector, registers a league automatically, imports scores or changes result-source publication.

## Historical safety and migration boundary

Changing a league team's EA ID is rejected once that team has accepted or pending matches. Existing dated club replacements require staff review, even before new evidence appears. Re-verifying the same current ID is allowed. Fixture IDs, kickoff times and team identities must remain identical when refreshing generated fixtures.

National club changes are blocked once the international shared results source is published. Before activation, linking country IDs does not change rosters, global players, photos, VA snapshots, schedules, points, statistics, selections, or the `publish_results`/`shared_league_id` gates.

This is the migration setup foundation, not a completed international cutover. Fixture-level history import, reconciliation of baseline player statistics, national fixture/collector configuration, unattended collection verification and an explicit source handover are still required before international results can stop depending on VA. Cup/knockout results must stay separate from league points.

## Verification

`scripts/league-team-linking.test.mjs` covers real SQLite persistence and conflicts, authorization/CSRF, duplicates, history protection, provider validation/fallback, international source-activation races, no false audits, explicit browser selection, safe name rendering, retry behavior and stale searches.

`scripts/league-suite-shell-preview.mjs` provides synthetic name searches and memory-only linking for browser QA. It never contacts production or persists these synthetic team links to a database. Arbitrary POST routes remain denied.
