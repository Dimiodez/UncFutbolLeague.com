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
