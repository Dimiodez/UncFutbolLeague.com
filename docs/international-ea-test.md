# International automatic EA test — November 12

This is a separate worker-backed test, not the public results-source migration. The public VA standings, historical matches, national rosters, player identities and photos remain unchanged.

- Tracker ID: `ufl-internationals-ea-test-20261112`.
- Collector: existing `ufl-preview-league-collector`, format 6v6, existing five-minute cron and hosted friendly transport. The 10v10 worker skips this format; no new worker, secret, binding or cron is needed.
- Calendar: 35 verified remaining Intercontinental league fixtures from November 12, including tonight's ten fixtures at 6:00 and 6:30 PM America/Chicago. Original `va-intl-*` IDs remain stable. The first ten historical games and seven knockout placeholders are excluded from this parallel test; no VA scores or stats are imported into its totals.
- Scoring: accepted results only, win 3/draw 1/loss 0. Existing EA archive, duplicate detection, incomplete/ambiguous/quit-score review, staff correction protection and player-stat enrichment are reused unchanged.
- Collection: 15 minutes before the first kickoff until 120 minutes after the final kickoff; missed fixtures retry for seven days. Feed failures remain visible and do not fabricate zero-score games or forfeits.

## Deployment and activation

Publish the website and deploy the CI-built collector bundle to the existing 6v6 worker, preserving all current variables, secrets, D1 binding, RPC exports and triggers. Its root must return release `international-tracker-20261112-v1`. Do not label a website deploy as a worker deployment.

League Suite's Internationals setup now offers Prepare, Start/Stop, Refresh status and a link to results/table/player stats. The new `international-tracker` API is behind the existing owner/admin access gate, rate limits, same-origin checks and optimistic revisions.

Prepare reads all ten country club IDs from the website database, validates their uniqueness and creates the test record **disabled** in the existing collector database. It never overwrites an existing tracker. Start verifies the deployed worker release and unchanged country mappings before enabling that record. Stop preserves all accepted records and remains available even if links become invalid. These operations do not change international `publish_results` or `shared_league_id`.

Before calling the test ready, verify the new worker release, enable the tracker, observe a real scheduled worker check for this ID, and run the existing hosted EA read-only preflight for all linked clubs. Scheduled runner delays/provider outages remain external dependencies. A fresh scheduler check is not evidence that a match has already been played or accepted.

If rolling back worker code, stop this tracker first; older worker bundles do not understand the international calendar. Existing Cloudflare deployment versions provide code rollback. Test data remains retained when stopped.

## Tests

`scripts/international-tracker.test.mjs` uses SQLite and both worker format paths to test tonight's fixture windows, all ten automatic results, standings/player totals, duplicate-free repeat polling, no VA dependence, feed failures, authorization/CSRF, disabled preparation, worker-release gating, stale revisions and stop safety. Browser/runtime calendar code is included in the publication parity guard.
