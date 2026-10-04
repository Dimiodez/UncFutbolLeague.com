# UFL major-update preview

Separate development branch and Pages project: `codex/ufl-major-update-preview` / `ufl-major-update-preview`.
Cloned from official website commit `33e2020` on 4 October 2026. This is not the collaborator's Firebase ZIP.

## Isolation

- Dedicated empty D1 database `6f0ee529-d74f-443f-9165-ffb746d210f1`; no production database binding.
- No bot service, Discord OAuth credentials, or production photo bucket binding.
- Advanced-mode `_worker.js` owns all requests; copied `functions/` are not deployed or executed.
- All non-GET/HEAD requests are rejected. Sign-in and backend workflows remain disabled until deliberately built against test resources.
- League pages initially use saved source snapshots. Live tracker checks, event publishing and account services are intentionally unavailable.
- Player portraits are excluded from deployment. A GET-only allowlisted proxy displays public portraits from production, with no cookies forwarded. Player photo ownership stays on production.
- The checkout retains existing tracked image files because it shares repository history; do not edit them on this branch. They are not a preview upload destination.

## Promotion rules

Never deploy this branch to `uncfutbolleague-com`. Use the guarded preview publishing script.
When approved, port reviewed feature changes onto a fresh production branch rather than merging preview infrastructure wholesale.
Preserve production `player-portraits.js`, `assets/league/player-*`, the photo bucket, publications, and approved player identity mappings. Reconcile against current production before any release.
Do not copy preview `_worker.js`, preview banner, preview publishing script, preview database ID, or preview hosting settings into production.

Public preview is shareable but not private/password protected; do not add secrets or private player information.
