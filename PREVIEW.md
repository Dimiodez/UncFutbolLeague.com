# UFL major-update preview

Separate development branch and Pages project: `codex/ufl-major-update-preview` / `ufl-major-update-preview`.
Cloned from official website commit `33e2020` on 4 October 2026. This is not the collaborator's Firebase ZIP.

## Isolation

- Dedicated D1 database `6f0ee529-d74f-443f-9165-ffb746d210f1`; authentication, staff-title, rate-limit and preview EA-link tables only; no production database binding.
- No bot service or production photo bucket binding. Discord credentials must be configured separately on this Pages project.
- Advanced-mode `_worker.js` owns all requests; only explicitly imported authentication and EA modules run. Other copied `functions/` are not deployed as routes.
- Discord registration/sign-in/sign-out and saving the signed-in user's preview EA club links are supported. Other mutations, including player photos, live bot commands and event publishing, remain blocked.
- League pages initially use saved source snapshots. Live tracker checks, event publishing and account services are intentionally unavailable.
- Player portraits are excluded from deployment. A GET-only allowlisted proxy displays public portraits from production, with no cookies forwarded. Player photo ownership stays on production.
- The checkout retains existing tracked image files because it shares repository history; do not edit them on this branch. They are not a preview upload destination.

## Promotion rules

Never deploy this branch to `uncfutbolleague-com`. Use the guarded preview publishing script.
When approved, port reviewed feature changes onto a fresh production branch rather than merging preview infrastructure wholesale.
Preserve production `player-portraits.js`, `assets/league/player-*`, the photo bucket, publications, and approved player identity mappings. Reconcile against current production before any release.
Do not copy preview `_worker.js`, preview banner, preview publishing script, preview database ID, or preview hosting settings into production.

Public preview is shareable but not private/password protected; do not add secrets or private player information.

## Discord OAuth activation

Add this redirect URL to the chosen Discord application's OAuth2 Redirects without removing the existing live callback:
`https://ufl-major-update-preview.pages.dev/api/auth/callback`

In Cloudflare Pages → `ufl-major-update-preview` → Settings → Variables and Secrets, configure production-environment `DISCORD_CLIENT_ID`, encrypted `DISCORD_CLIENT_SECRET`, and `OWNER_DISCORD_ID`. SITE_ORIGIN is set in wrangler.toml. Existing encrypted production secrets cannot be read back or copied by the Cloudflare API; configure them explicitly and redeploy. Do not put secrets in chat or Git. Using the same Discord app does not share sessions: cookies are host-only and users/sessions live exclusively in the preview DB.

## EA connection

`/ea-clubs.html` provides public club search and recent league/playoff/friendly results via the existing HTTPS relay. It shows the actual returned timestamps, not fabricated fresh games. Signed-in users can save independently verified club selections to their own preview account at `/api/ea/links`. This is not proof of club management/ownership, not EA player claiming, not league registration, and does not add games to standings. Scheduled-fixture matching and verified player identity remain later milestones.

## League workshop — first major-update milestone

`/league-workshop.html` is a no-login planning/test surface, not a replacement for secure admin or manager access. Multiple leagues can be drafted under one season; no leagues are created by default. League creation selects format, players per side, day, first date, kickoff, timezone and spacing between two games. Double round-robin fixtures preserve local kickoff through DST. Odd-team leagues show unavoidable byes.

Drafts save only on the current device when explicitly requested, or as an exported JSON file. They are not shared server records. Imports regenerate/validate schedules rather than trusting arbitrary fixtures. EA candidate checks require both linked club IDs plus the configured kickoff window; ambiguous candidates require review. Even one candidate is not counted automatically. No result acceptance or standings/stat/award publication exists yet.

Public Virtual Arena review on 4 October 2026: inspected competition standings, team list, Roma profile/roster, stats and squads navigation. Observed season-scoped Teams/Players/Matches/Finals/Stats/Standings/TOTW tabs; team profiles separate calendar/history, grouped player positions, per-player stats and formation. No authenticated VA admin controls were inspected. Collaborator screenshots are needed to compare those controls, not to define UFL requirements.

Next: durable season/league/member model with one active team per player per league; admin/manager authorization and invitations; scheduled result review/acceptance; accepted-results-only standings/stats; TOTW/TOTS formation tools. The user's shared planning Doc remains authoritative; this first milestone does not claim those later features are implemented.
