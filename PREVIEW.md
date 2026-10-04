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

Create leagues with zero teams. Each league has separate draft team registration; close registration before generating fixtures (3–40 teams for this two-opponent format). Reopening registration preserves teams but clears draft fixtures after confirmation. League creation never requires a minimum team count. EA IDs entered manually are explicitly unverified.

Drafts save only on the current device when explicitly requested, or as an exported version-3 JSON file. They are not shared server records. Version-1 and version-2 files remain supported. Imports validate teams and regenerate only schedules previously generated, rather than trusting arbitrary fixtures. EA candidate checks require both linked club IDs plus the configured kickoff window; ambiguous candidates require review. Even one candidate is not counted automatically. No result acceptance or standings/stat/award publication exists yet.

Public Virtual Arena review on 4 October 2026: inspected competition standings, team list, Roma profile/roster, stats and squads navigation. Observed season-scoped Teams/Players/Matches/Finals/Stats/Standings/TOTW tabs; team profiles separate calendar/history, grouped player positions, per-player stats and formation. No authenticated VA admin controls were inspected. Collaborator screenshots are needed to compare those controls, not to define UFL requirements.

Next: durable season/league/member model with one active team per player per league; admin/manager authorization and invitations; scheduled result review/acceptance; accepted-results-only standings/stats; TOTW/TOTS formation tools. The user's shared planning Doc remains authoritative; this first milestone does not claim those later features are implemented.

## VA replacement acceptance checklist

### Draft league administration calendar

The workshop now groups all locally drafted seasons, leagues and competition calendar entries in one overview. Seasons may be created before leagues or teams. Existing league cards expose editable start date, weekday, kickoff, timezone, 1–4-week recurrence and game spacing. Inclusive date-range breaks skip matching recurring nights and push the preserved round-robin matchups into subsequent slots. Adding a cup/playoff calendar draft can reserve its dates across one league or every current league in that season; it does not create brackets or results. Future leagues must have those breaks configured separately. Removing a calendar break explicitly reopens that slot; cup dates remain visible as metadata.

These are preview controls, not a secured owner/admin page. OAuth activation and server-side role enforcement remain prerequisites for shared writes. No production schedules/results change. Version-3 save/export includes seasons, competitions and league calendar settings, with versions 1 and 2 still supported. Admin calendar edits rebuild only local draft schedules after confirmation; live-result-preserving rescheduling must be implemented separately before promotion.

Do not treat the workshop as migration-ready until the complete operational flow is tested:

- Shared, persistent seasons and initially empty leagues; independent registration windows and configurable matchnight settings.
- Discord identity and tested administrator/manager permissions: managers edit only assigned teams/players; administrators manage seasons, standings and awards. Do not simulate authentication in the public preview.
- Team registration after league creation, display name separate from EA club name, verified EA lookup/recheck, assigned managers and roster invitation links.
- Stable player identities across leagues, PSN/Origin/Xbox identifiers (never credentials), one active team per player per league, shared portraits preserved.
- Schedule generation after registration, two opponents per night, home/away round-robin, configurable weekdays/timezones, byes and explicit rescheduling rules.
- Scheduled-game ingestion, duplicate prevention, ambiguous-game staff review, acceptance/correction history; unrelated club games never count toward the league.
- Accepted-results-only standings and player/team statistics, with goals, assists, goals against, defender clean sheets, ratings and successful tackles where supported by verified data.
- Team calendar/history, rosters grouped by position, player profiles and formations; separate concurrent 6v6 and 10v10 views.
- Administrator-selected TOTW/TOTS formations, position eligibility, week/season filters, average-rating candidates, player portraits/team crests and downloadable award images.
- Season cups with knockout/random draws; later top/bottom finals and division-combination rules. Calendar/attendance integration remains optional until specified.
- Import/reconciliation dry run against VA: identities, rosters, fixtures, results, standings and stat totals agree; permissions, rollback, backups and image preservation verified before switching the official site.

Implementation order: persistent league/registration and permissions first; scheduling and accepted-result pipeline second; public views and awards third; migration rehearsal last. The initial local builder covers only draft league registration, schedules and EA candidate review.

## Saved handoff — 4 October 2026

- League administration and calendar work is deployed at https://ufl-major-update-preview.pages.dev/league-workshop and committed on this preview branch. Tested empty league creation, subsequent registration, recurring schedule edits, cup/break reservations, DST, preserved matchups, and save/reload.
- The user is independently testing Maykop club changes at https://ufl-maykop-club-preview.pages.dev/test/maykop?v=analytics-204dd43 before approving them for production. This chat did not modify, deploy or verify that preview; the web reader could not access it.
- The user may edit live team pages during league development. At promotion, start from the latest production revision and reconcile approved Maykop work, team edits, shared identities and portraits. Never replace production with this older clone or deploy its isolated infrastructure to the live project.
- Remaining major work: shared database-backed seasons/leagues/registration, real owner/admin/manager enforcement, rosters and invitations, accepted-result pipeline, league views/statistics, awards, then a VA migration rehearsal.
- Browser-created league drafts are separate from Git: use “Save drafts on this device” before closing; download a draft file to move them to another PC. Do not claim unsaved browser entries are backed up by committing code.
