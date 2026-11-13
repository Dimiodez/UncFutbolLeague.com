# International automatic EA test — November 12

This is a separate worker-backed test, not the public results-source migration. The public VA standings, historical matches, national rosters, player identities and photos remain unchanged.

- Tracker ID: `ufl-internationals-ea-test-20261112`.
- Collector: existing `ufl-preview-league-collector`, format 6v6, existing five-minute cron and hosted friendly transport. The 10v10 worker skips this format; no new worker, secret, binding or cron is needed.
- Calendar: initially prepared with 35 remaining league fixtures. The owner-approved historical import expands it to all 45 league fixtures with stable `va-intl-*` IDs. Seven knockout placeholders remain excluded. The owner confirmed November 12 kickoff at **9:00 / 9:30 PM America/Chicago**; the baseline import corrects those ten fixture times. Later dates retain their VA calendar times until confirmed.
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

## One-time VA historical baseline

The owner requested continuing from the results and stats already gathered from VA. `data/international-baseline-20261112.json` freezes the ten completed VA match reports (339–348), their original EA match IDs/timestamps, player sheets and published standings/leaderboard totals. `scripts/capture-international-baseline.mjs` captures this evidence once and refuses to overwrite it.

Suite offers Preview existing VA results & stats, then Import verified VA baseline. Preview requires original EA friendly evidence from the collector cache: exact match ID, timestamp, national club pair and unique player-name match within that club. Numeric EA player IDs map to VA user IDs only inside this competition. Missing or ambiguous identity evidence blocks the entire import. All ten standings and 59 player aggregate totals are checked against the frozen source, including available rating averages. Future EA appearances use the same competition identity and combine actual appearance ratings, rather than averaging averages.

Import is revision guarded and transactional. A permanent audit record stores the complete before/after drafts, owner and evidence digest in `preview_international_baseline_audit`. Existing accepted results, pending records, worker enablement and public migration settings remain unchanged. Imported results retain original EA evidence plus VA provenance and protected staff-correction metadata. An existing baseline cannot be replaced by rerunning the operation. The existing international-ready worker preserves these fields and corrections, so importing history does not require another worker deployment.

Regression tests cover the full 10-match / 28-goal / 113-appearance baseline, 59 players, kickoff correction, future fixture preservation, exact identity checks, unchanged inputs on failure, future EA stat continuation, repeat-import rejection, read-only preview, audit/transaction behavior, concurrent revision conflicts and collector protection of history.
