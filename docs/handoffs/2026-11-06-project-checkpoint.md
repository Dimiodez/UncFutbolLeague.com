# November 6, 2026 — saved project checkpoint

Canonical website repository: Dimiodez/UncFutbolLeague.com, production branch master. Website baseline before wheel UI work: 0a58deeecb75a3e26df9f61bb7b869c8590e21d5. Existing Cloudflare GitHub/master production deployment connection remains unchanged.

## Completed and published

- UFL Internationals public landing, national squads, schedules/results/standings/stats/TOTW groundwork, owner/admin-only roster management, portable flags, and responsive UNC styling.
- Ten nations and 60 initial national roster slots: 50 canonical profiles reused, ten new profiles. Confirmed aliases retained; club memberships were not moved. Rosters can grow beyond six; five to six is the match-day human-player format.
- Additive schema and roster/date migrations saved in migrations/20261106_internationals*.sql. Eighteen owner-provided international dates from November 10, 2026 to September 2, 2027.
- Verified VA Intercontinental Cup schedule snapshot, competition 4 / season 6: 45 league fixtures (each pair once, nine per nation), plus seven unassigned knockout slots. Source links and stable va-intl-* identities retained; Central kickoff display. No knockout opponents or results invented.
- Overall ten-team standings plus European and Americas five-team tables read one approved league result source. Cup knockout IDs cannot add league points.
- Public 6v6/10v10 and League Workshop date shortcuts, current/next and missing-result actions, collapsible matchdays, search/status controls, compact public heading, and preserved unsaved correction input when filtering.
- Application and runtime module mirrors/versioned import chains updated together. No polling, collector routing, access rules, prediction-saving code or result data changed for the schedule UI task.

## Validation and deployments

- Internationals base and identity/access checks passed; final calendar/VA integration passed 355 tests.
- Public/workshop schedule UI: GitHub Actions run 42291322642, 358 tests passed, plus public build and immutable collector artifact build.
- Public schedules checked live on desktop and at a 390px mobile viewport, with no page-wide overflow. Workshop controls checked in an explicitly read-only review at the owner's preference; unsaved correction reason survived status-filter changes. No correction was submitted during verification.
- Production deployment successfully verified at 0a58deeecb75a3e26df9f61bb7b869c8590e21d5.

## Bot source verified

Canonical bot source is saved in Dimiodez/UncWheelUnited, main, at b56552885952b1da2a5967748454024ad2217d52 (private shared hosted EA feed for match commands). GitHub source and deployed artifact were verified in the earlier bot repair. This checkpoint confirms source persistence; it does not claim an automatic GitHub-to-bot deployment pipeline was configured. User tabled that separate deployment-pipeline change.

## Pending setup and cautions

- International EA club IDs and a properly mapped shared collector source are still needed before automatic international result collection is enabled. The VA fixture module is a checked schedule snapshot, not a live VA result feed.
- VA has 55 registrations versus the owner's 60 supplied roster slots. Preserve owner-supplied rosters until differences are clarified; do not delete/merge profiles solely to match that count.
- Cloudflare's separate branch-preview environment lacks D1 bindings; this predates today's UI work. Production bindings are working. Do not reconnect or replace the GitHub/Cloudflare integration to work around preview-only limitations.
- Git stores source, migrations and documented seed snapshots. Production database state and secrets remain in their configured services; never commit environment files, credentials, generated dependency folders, or unrelated stale local checkouts.
- Next authorized task: improve wheel UI/UX to match the existing UNC theme, keeping wheel behavior and saved configurations intact.

Operational details: docs/internationals.md and docs/schedule-agenda.md. Local screenshot/handoff artifacts are review evidence only; canonical application source is GitHub.
