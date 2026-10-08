# UFL major-update preview

## League-workspace UX redesign — 8 October 2026

Creation is now a four-step guided flow: league details, playing rules, matchnights, then a readable review before creation. Each step validates its own fields; keyboard submission advances instead of prematurely creating a league. Names, fixed/custom pitch size, substitute capacity, keeper rule, timezone/day/time/recurrence and game spacing remain supported. Teams are still optional. The original builder remains the canonical form; cloned league settings explicitly strip wizard-only hiding/review content so all existing editors continue working.

The start screen is a compact searchable/filterable league library. Season/event administration is collapsed into secondary tools; backups are grouped separately. League cards show status, team/fixture counts and a single Manage league action instead of exposing all team forms and fixture lists. Inside a league, desktop sidebar/mobile scrollable navigation replaces the crowded horizontal desktop tab strip. Lifecycle milestones and next-action cards guide setup. Matches separates Calendar from Fixture review and folds configuration/windows/breaks; registering a team has its own disclosure. Cups and existing finals settings remain available under Cups & finals. Detailed preview limitations remain accessible without repeating large warning blocks.

This changes presentation/navigation only, not storage schema or result rules. Existing v1–v4 imports, current local drafts, accepted results, cup draws and award selections remain on the same storage key. No production website, bot or artwork was touched. Browser QA created a 10v10 league through all four steps, verified Tuesday defaults/review, opened the full cloned settings editor, registered three teams, generated fixtures, switched Calendar/Fixture review, and returned to the league library. Mobile check at 390×844 had no page horizontal overflow (only intentionally scrollable navigation); console warning/error logs were empty. Existing model/schedule/award/team-rule tests passed.

## Full-night bye correction — 8 October 2026

The initial feature left the former split-bye option selected by default. Normal creation/settings now offer full-night byes only. Loading an odd-team draft with at least five teams and no accepted results repairs the former split schedule, retains all teams/calendar settings and saves the correction. The prior local draft file is retained under `ufl-v2-workshop-drafts-v1-before-full-night-byes`. Draft imports apply the same repair in memory. Accepted-result schedules retain their historical bye mode and IDs; the legacy selector is locked in their settings. Three-team full-night scheduling remains impossible and is rejected. A nine-team regression reproduces the reported case and verifies team 1 has zero games while team 8 has two, alongside the full 5–39-team invariant suite.

## Stream directory, shared invite intake and full-night byes — 8 October 2026

Videos is now labelled Stream Links (the stored `videos` key remains compatible). Streamers have a registered-team ID, display name and HTTPS channel link. Team filtering shows associated streamers, not a fabricated live/offline status. Older video records remain in exports and are not silently reassigned. Removing a draft team removes its directory entries; existing team names are escaped in selectors.

League creation and settings offer split byes (legacy/default) or a full-night double bye. For odd counts 5–39, a graceful-cycle schedule gives exactly one team a night off per week, and everyone else two distinct opponents at different kickoff slots. Every team gets exactly one full-night bye, every pair meets twice with opposite home/away, and total fixtures/dates remain a double round-robin. Three-team full-night scheduling is rejected because only two active teams cannot play different opponents. Even counts retain their original schedule. Byes are calendar metadata, never fixtures/results, points or appearances. Changing policy counts as a calendar rebuild and is blocked once results have been accepted. Calendar team filtering retains the selected team's night off; Season at a glance lists weeks, byes and both kickoff slots.

Teams includes a separate shared preview registration inbox (`/api/registration`, preview D1 only). Signed-in website owner/admin can create one 90-day manager invite for a draft, review submissions and approve/import a team. The manager's Discord identity comes from the authenticated session, not submitted text. After approval the manager can return to the same invitation to create/replace a player link; staff can also create it from the inbox. Players sign in and submit their EA name for staff review. Staff can mark player requests approved in this inbox. These are shared intake records, not canonical live rosters, verified EA identities, EA club ownership, or bot/team-manager permissions. League drafts, official result approval and schedules still remain local. The invitation does not grant website staff access.

Links use random tokens stored hashed on the server; replacement invalidates a team's previous player link, and expiry is enforced. Writes require same-origin requests and active Discord sessions; board listing/approval require website staff. Manager link generation requires that team's session identity or staff. Limits, duplicate names/EA clubs, one manager submission per league, one player request per league, roster capacity and registration/transfer windows are enforced server-side, with unique constraints/atomic capacity inserts. Team registration close/reopen waits for shared state to update before changing the local draft. Settings changes sync metadata; failures explicitly report that the shared invite needs updating. A manual Update invite settings button provides retry. Store/export the draft to preserve its inbox reference. Schema creation is idempotent and scoped to three preview tables plus an EA-club unique index; no production bindings were added.

Automated tests: full-night schedules for every odd count 5–39, all prior scheduler/season/scoring/model tests, shared registration auth/CSRF, isolation, approvals, expiry/rotation, duplicate/capacity/closure checks, and stream validation/removal. Browser QA created seven teams, generated the full-night season, confirmed the bye survives team filtering, saved a stream link and checked both empty and populated team filters. Actual multi-user Discord OAuth invitation testing remains a user acceptance step; no live rosters were populated.

## Configuration-only navigation — 8 October 2026

Removed duplicate Stats and Standings destinations from league-workspace navigation, including keyboard navigation. The public tab catalogue and saved statistics/scoring settings remain unchanged. Rules now includes the existing Points & tiebreakers editor: regular-time win/loss 3/0 and extra-time win/loss 2/1 by default, with no draws. This does not connect automatic ingestion or change accepted-result calculations.

## Scheduled-result gate, season calendar and cup planning — 8 October 2026

The EA candidate search requires the scheduled club IDs, kickoff window and league-local calendar date, and excludes already-used match IDs. It is not proof that a same-opponent game is a league game: staff must explicitly approve a candidate and confirm regular time vs extra time. Local acceptance rejects reused games, duplicate fixture results, wrong dates/opponents, missing scores and draws. Penalty/tied-score winner review is not yet supported. Candidate checks alone never change totals.

Accepted local results alone feed preview standings (3/0 regular time, 2/1 extra time by default), player totals and TOTW candidate records. A 3.0 rating is retained in match data but excluded from averages by the existing setting; goals/assists/appearances remain. Missing EA statistics stay unavailable. Exact positions must be present as a recognized position code to qualify for TOTW; broad or numeric unknown roles are not guessed. Canonical player portraits/position mapping, official accepted-result storage and secured league-specific approval remain launch work. These are not authenticated official match approvals.

Draft file version 4 stores accepted results, validates them again during restore, and preserves original team IDs. Older v1–v3 drafts still open. UI calendar regeneration/reopening is blocked after local acceptance to prevent result loss. Calendar-only competition insertion also cannot rebuild a season that has accepted results.

Matches has a team-filtered agenda calendar showing league weeks, kickoff in league/device time and skipped dates. Saved cup plans also list there. Finals has a structured cup planner: random knockout with byes, one/two-leg ties, or one/two-round round robin. Two selected same-season/format divisions can create UCL top-half and UEL bottom-half pools from current standings. Odd divisions place the extra team in the top half (explicit in UI); provisional qualification requires explicit selection, otherwise both divisions must finish. Draw snapshots are saved rather than rerandomized during render/import. Cup fixture identities stay separate from league fixtures. Cup dates conflicting with linked entrants' generated league nights are rejected; existing cup plans reserve dates when generating that league schedule. Cross-division future calendar synchronization still needs shared competition records.

Remaining: unattended server checker; shared owner/admin fixture approval and audit/corrections; cup winner resolution/advancement/results; shared calendar RSVP/notifications linked to Discord; real shared league identities and records. No fake RSVP buttons or successful automatic-check claims are shown. Tests cover scheduled gates, 3/0 and 2/1, saved-result validation, UCL/UEL splitting, byes and round robin, plus existing schedule/page/award regressions. Browser QA created a four-team league, generated its fixtures, opened the calendar, saved a Friday knockout draw and verified its cup dates in Matches; console warning/error logs were empty. Live website, bot and player artwork remain unchanged.

## Optional keeper and shared award archive — 8 October 2026

The workbench allows blank GK, a named manual AI keeper, or a selected player keeper. Ten outfield selections complete an award: blank GK is omitted from the public pitch and PNG, not treated as an incomplete lineup. AI keeper is a separate presentation-only field, never included in player selections, ratings, rosters or the official player-award list. Its name is validated and saved with the local board. No Discord push is implemented.

`/totw` is the shared preview archive, with season filtering and keyboard-accessible week tabs. Each week places published 6v6 and 10v10 teams alongside one another, including player artwork/badges and PNG downloads. TOTS uses a separate season tab. Empty leagues show a not-published message. There are no seeded official/sample awards.

Publishing from the workbench requires a real website owner/admin session, enforced server-side at `/api/awards`; anonymous/moderator/member requests cannot publish. This is website authorization, not Discord-server role mapping. Ten outfield players are required; fabricated sample selections are rejected. Publication is keyed by season, format, league identity and week number/type. An explicit replacement checkbox and revision comparison prevent accidental or stale overwrites; previous revisions are retained in `preview_award_revisions`. The archive snapshots are shared across devices. Draft editing/saving remains device-local. A manually entered week number supports breaks/cup weeks without forcing calendar-week numbering. Canonical league/player identities and the accepted appearance feed remain launch work; the archive does not independently verify EA performance, and is not a live automatic award pipeline.

Migration `0016_preview_awards.sql` applied only to the isolated preview D1 database. The Worker exposes just the new award endpoint alongside existing preview auth/EA routes; other production mutations stay blocked. Browser QA verified deployed blank/AI controls, keeper-name save/reload persistence, unauthorized publishing disabled and public empty state. Unit tests exercise publication with ten outfield players, AI separation, sample rejection, authorization, same-origin protection and stale revision rejection. Actual in-memory SQLite tests exercise insert, replacement, conflict, public retrieval and preservation of the earlier AI snapshot. An authenticated browser publication/populated archive was not performed because no genuine accepted candidate feed is connected. No live-site/bot/player-photo records changed.

## Shared formation catalogue — 8 October 2026

`fc27-formations.js` now holds all 44 named entries from the requested FC27 formation reference, including numbered and descriptive variants, without Kick Off/Ultimate Team designations or source references in the interface. It is a versioned, immutable, dependency-free module for awards and future team/roster screens. `formationSlots(name)` returns independent full-XI slot records (stable positional IDs, positions, percentage x/y and card widths). Attack is top, GK bottom, team-left is screen-left. UI and PNG export use exactly the same geometry. Descriptive/numbered aliases share their appropriate underlying layout. No reference artwork is deployed.

Replaced evenly spaced rows with explicit staggered positions: 3-5-2 now has CAM/two CDMs; wide/narrow diamonds and 4-2-3-1 differ; flat/holding/attack/defend variants have appropriate midfield roles. The reference's Narrow 4-2-3-1 page mistakenly reuses the wide diagram; we use the three-CAM narrow shape. The 4-4-2 Holding/(2) image was unavailable; its double-CDM layout is represented explicitly rather than substituting the flat shape. Five-back positions retain the reference's LB/RB labels and advanced depth. Eligibility remains independently configurable by the admin.

Saved awards carry `formationVersion: 1`. Unversioned prototype 4-2-3-1 boards migrate to Wide, 3-5-2 to 3-1-4-2, and 4-1-2-1-2 to Narrow, preserving their original slot IDs, eligibility and selected players rather than silently relabelling player roles. New selections use the corrected names/roles. Future catalogue changes must migrate old versions, not silently change saved lineups. Team and roster selection consumers are deferred, not implemented by this change.

Verification: catalogue tests cover all 44 entries, unique formation/slot IDs, XI/GK count, coordinate bounds, semantic variants, immutable shared data, non-overlapping export cards and legacy migration; award and league-page regression tests pass. Deployed-browser QA verified all 44 options, visually checked the narrow diamond, and checked five-back slot positions in the rendered DOM. Real candidate feed and authenticated shared admin permissions remain unconnected as noted below. Only the isolated preview is deployed.

## Full-XI TOTW / TOTS workbench — 8 October 2026

The Awards tab is now `TOTW / TOTS`, with a full eleven-player formation including GK regardless of 6v6/10v10 match size or keeper rules. It replaces the earlier format-sized award settings. Available formations: 3-4-3, 4-3-3, 4-4-2, 4-2-3-1, 3-5-2 and 4-1-2-1-2. Each individual winning slot has editable qualifying recorded positions; GK remains GK-only. A CB slot may include CDM, or CM/ST may include CAM.

One screen filters a seven-day local-time window or the full league season, minimum qualifying appearances, and highest average valid rating. Accepted appearance records must match the exact league and season, carry an exact position, and deduplicate by match/player. The configured 3.0-rating exclusion keeps appearances but excludes that rating. Candidates support drag/drop or Select-then-slot placement, duplicate-player prevention, individual removal, portraits/badges with fallback initials, and PNG download. Incomplete real lineups are labelled DRAFT. Weekly and seasonal selections save separately within each local league draft, and survive draft export/import. Tab navigation warns about unsaved selection changes.

Important: the workshop still has no accepted league appearance feed or secured shared admin permissions. Its real candidate list is empty, not substituted with VA aggregates or current roster data. Explicit sample mode exists for interaction testing only: fabricated players, disabled award saving, and watermarked exports. Do not describe this as live automatic awards. Before shared launch, connect verified accepted-match appearances and canonical league/player IDs, authenticated owner/admin authorization, shared saved lineups, and available player artwork. No live website, player portraits or bot records were changed.

Verification: five Node suites passed, including full-XI formation invariants, eligibility, league/season isolation, accepted-only input, deduplication, disconnect rating handling, timezone/date boundaries, duplicate-player guards and saved-board validation. Deployed-browser QA verified eleven slots, custom CB/CDM eligibility and reload persistence, highest-first sample rankings, click-to-place, unsaved-tab warning, full-season switching and separate saving. PNG downloaded successfully and was visually checked; browser warning/error logs were empty. Native drag/drop is implemented but was not exercised end-to-end by the DOM-only browser driver. The user's existing stable-preview draft/tab was left untouched.

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

### Structured league editors — 8 October 2026

Replaced the generic section-note editors with purpose-built configuration dialogs. Rules have individual categorized title/description cards and explicit amps/boosts/ANY policy switches (policy only, not EA equipment detection). Videos are separate titled HTTPS entries, with add/remove controls and validation. Players exposes the actual draft roster capacity plus EA-identity and transfer-window policy switches; one active team per player per league remains fixed. Finals exposes format, qualifying-team count, single/two-leg ties and third-place configuration. Stats exposes supported metric checkboxes, minimum appearances and excluding 3.0 ratings only (other match stats remain counted by the future pipeline). Standings has numeric points and reorderable tiebreaker priority. Awards has format-aware formation choices, minimum appearances and candidate-ranking metric. Overview and Matches retain the working format, calendar, registration and break-window forms. Team management is a searchable list with one-team editing dialogs and explicit two-step removal confirmation; changing/removing teams after fixture generation remains blocked until reopening registration.

Dialogs have persistent Save/Cancel controls, field validation, explicit discard behavior and an unsaved-change guard on Escape. Legacy notes and video links are preserved/revalidated on version-3 restore; legacy rule text migrates into an editable rule card on its next save. Structured policies are local configuration, NOT shared enforcement, automatic standings, brackets, award lineups or EA detection. Do not imply otherwise in the UI or handoff. The public/live website, bot, badges and player images are unchanged.

Verification: all four Node suites passed with expanded invalid-input, structured-content round-trip, duplicate-team and removal guard coverage. Deployed-browser QA saved every structured editor, checked reordered tiebreakers, verified reload persistence, renamed/removed a disposable QA team and verified discard preserves existing points. Corrected populated-section empty states and visually checked the final dialog footer; browser warning/error log was empty. The user's original preview tab and draft data were left untouched.

### League page screens — 8 October 2026

Creating a league now opens its full tabbed page with zero teams: Overview, Rules, Videos, Teams, Players, Matches, Finals, Stats, Standings and Team of the Week. Existing leagues have an “Open league tabs” button. The page’s explicit local-preview publication state is independent of team count, registration and fixture generation. Publishing/unpublishing and section edits save the version-3 draft on this device; all-league export/import preserves them. This is NOT shared/public publishing, not a public invitation URL and not authenticated owner/admin enforcement. Those remain pre-launch prerequisites.

Overview retains playing rules/calendar editing; Matches includes dated windows, breaks and generated fixtures/EA candidate review; Teams retains registration and adds draft name/EA-ID editing with duplicate checks. Team editing is blocked after fixture generation until registration is reopened, avoiding stale fixture identities. Rules, introductions, video links, player eligibility notes, finals notes, statistics policy, standings points policy and award criteria can be edited in their own tabs. Video links require HTTPS; imported content is validated before rendering. Stats/standings/players/finals/awards explicitly identify unfinished pipelines and do not invent results, player counts, rankings or awards. Points policy is saved only and not applied to results yet. Badges and portraits are unchanged.

The EA matching contract remains exact scheduled opponents plus kickoff window and unique EA match ID, with ambiguous candidates held for review. A ten-team league must not ingest all club games or count unrelated opponents/friendlies. Automatic result acceptance, idempotent scheduled ingestion, corrections and accepted-results-only aggregates still require implementation and end-to-end tests. Club linking alone does not activate that pipeline.

Verification: all four Node test suites passed (league engine, playing rules, preview connections and league page model). Isolated deployed-browser QA created/published a zero-team league, saved rules, registered and renamed a team afterward, changed points policy and verified reload persistence. Added two further teams, closed registration and generated fixtures; all ten tabs rendered. The user's existing stable-preview tab and its drafts were not reloaded or changed.

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

Implementation priority updated by the user on 8 October 2026: finish formats, league creation and team-management screens first. Keep their data model compatible with later shared records, but defer bot–website registration integration until the final pre-launch phase. The full acceptance checklist still applies before replacing VA or publishing live; finishing screens alone does not make the system launch-ready.

### UNC workspace presentation — 8 October 2026

The league workshop now uses the site's crest, navy/red palette, Barlow Condensed headings, Inter forms, theme selector and responsive navigation. Guided creation, league panels and editors retain their existing behavior. Styles are scoped to this workshop; production pages, player images and the bot are unchanged. The Admin navigation is preview presentation, not a completed production admin integration. Publishing still requires the shared-storage and authorization work described above.

### Final pre-launch: player stream identity and status

- Pending implementation: attach each Twitch channel to the canonical player identity once, not a typed streamer name or a single league/team entry. Show the correct stream link on the player stats/profile page and derive team stream directories from current league memberships.
- Show a non-interactive status indicator in a top corner of the player portrait: green LIVE when broadcasting, red OFFLINE when confirmed not broadcasting. The status badge is not a separate link; clicking the portrait continues to open the player's stats/profile page, where the stream link is available.
- Configure Twitch API credentials server-side and verify automatic status refresh (target 1–2 minutes), including live → offline transitions. If the API fails or status is unknown, show Status unavailable or omit the indicator, never a fabricated OFFLINE status.
- Before publishing live, test the same player across 6v6, 10v10, team transfers and future seasons; verify profile links, portrait navigation and badges on desktop/mobile without overwriting portraits. This is a final acceptance item, not functionality already connected by the preview's Stream Links editor.

### Final pre-launch: bot–website registration connection

- Connect bot `/register` and `/linkclub` to the same canonical league/team records used by the website, with verified numeric EA club ID plus platform/game context.
- Preserve Discord-server isolation and stable season/league/team identities; test manager permissions and duplicate prevention across both entry points.
- Enable real shareable, revocable registration invites only after authenticated shared storage is ready, enforcing registration windows and roster limits server-side.
- Verify that website and bot reflect each other's approved registrations and links, without overwriting live team edits, portraits or approved Maykop features.
- Complete this connection and its end-to-end tests before publishing live. Do not prioritize implementing it ahead of the requested format/creation/team screens unless the user changes that order.

## Saved handoff — 4 October 2026

### Team playing rules — 8 October 2026

League creation/editing and cup/event creation now save separate playing and roster rules. 6v6 fixes the on-pitch count at 6; 10v10 fixes it at 10; only Custom permits editing that count (1–11). Maximum roster size includes starters and substitutes, must be at least the on-pitch size, and currently has a validation ceiling of 100. New forms suggest 12 but this is editable, not a published UFL rule. “Keepers enabled” is an explicit independent boolean for each league/cup and does not increase the on-pitch count. It starts unchecked; existing league drafts with no keeper rule also display disabled, and old calendar-only cups retain “Playing rules not set.” Legacy league roster limits default to their playing size rather than inventing substitutes. These rules persist in local saves/exports; shared roster-limit enforcement and EA-based keeper compliance checks are not implemented and must not be claimed.

### Registration, transfer and break windows — 8 October 2026

League cards now expose named, inclusive date windows in the league timezone: team registration, midseason transfers/substitutes, league-wide bye, holiday, cup break, and other break. Registration must end before the configured league start date. Team draft registration checks both the manual open/close flag and any configured registration windows at submission time. Restoring a saved roster bypasses the time gate so expired windows never erase teams. Transfer windows start on/after the league start date and store the intended roster-change period; no player add/remove/sign/substitute operations exist in this workshop yet. They never postpone fixtures. The four break types postpone all league matchnights in their date ranges, not individual-team fixtures. Changes to roster policy windows do not rebuild fixtures; actual calendar changes do, with inline confirmation. Dates and types persist in the existing version-3 file format.

The requested self-registration invite is NOT implemented: the preview has only local league records and cannot receive registrations from another device. Do not generate a URL containing a local draft and claim registrations sync. The intended shared implementation needs stable league/team/season IDs, verified manager identity, owner/admin-issued revocable/expiring invite tokens, server-side registration-window and roster-limit checks, scoped authorization and an audit trail.

The user wants bot registration to be an alternative to the website form, with the correct numeric EA club ID supplied by verified club search/linking rather than manually transcribed. Use one canonical team registration across bot/site, keyed by Discord server and league, with manager assignments, EA platform/game context and club ID. The existing bot `/register` and `/linkclub` records are not yet synchronized to this clone. Do not weaken preview isolation or write production records merely to make invites appear functional. Implement authenticated shared records before enabling cross-device invitation or roster-action enforcement.

- League administration and calendar work is deployed at https://ufl-major-update-preview.pages.dev/league-workshop and committed on this preview branch. Tested empty league creation, subsequent registration, recurring schedule edits, cup/break reservations, DST, preserved matchups, and save/reload.
- The user is independently testing Maykop club changes at https://ufl-maykop-club-preview.pages.dev/test/maykop?v=analytics-204dd43 before approving them for production. This chat did not modify, deploy or verify that preview; the web reader could not access it.
- The user may edit live team pages during league development. At promotion, start from the latest production revision and reconcile approved Maykop work, team edits, shared identities and portraits. Never replace production with this older clone or deploy its isolated infrastructure to the live project.
- Remaining major work: shared database-backed seasons/leagues/registration, real owner/admin/manager enforcement, rosters and invitations, accepted-result pipeline, league views/statistics, awards, then a VA migration rehearsal.
- Browser-created league drafts are separate from Git: use “Save drafts on this device” before closing; download a draft file to move them to another PC. Do not claim unsaved browser entries are backed up by committing code.
