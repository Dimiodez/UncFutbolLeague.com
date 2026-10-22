# Approved site-flow cleanup

Implements the October 22 audit while retaining the complete UFL / UFB header, Utility / Fun / League navigation, existing themes and access policy.

## Coverage of approved findings

| Audit | Change |
| --- | --- |
| 01 | Branded 401/403 Suite recovery, safe sign-in return, Home and League links; private/no-store responses. |
| 02 | Stable league/section URL state, reload and browser history; unapplied-edit and award guards. |
| 03 | Responsive navigation focus containment, inert obscured content, Escape/focus restoration. |
| 04 | Separate browser settings, explicit account backup and server collector status; test leagues distinguished from official standings. |
| 05 | Test registrations and Tournament Control Room labels; authorized Account/Admin Suite launchers. |
| 06 | Compact Suite introduction/notices; owner access controls under Settings, access & backups. |
| 07 | Shared display-timezone preference for Home league calendar, fixtures, Pick’ems and Suite; scheduling inputs/timestamps unchanged. |
| 08 | Persistent saved/unsaved/saving/failure ballot states, unchanged-save disabled, failed account reads blocked from submission. |
| 09 | Shared parent context: all four games return to Arcade; house trackers return to house teams; Home recovery elsewhere. |
| 10 | Signed-in Arcade and Wheel copy reflects the session, without granting publishing access. |
| 11 | FUNC current clubs from the public season catalog, with labelled Season 1 options and preserved historical card ids/artwork. Current crests remain local/export-safe, with UFL fallback where no reviewed local asset exists. |
| 12 | Season 1 division picker excludes unsupported 10v10; old deep links explain the unavailable archive and offer valid alternatives. |
| 13 | Not-found page recovery plus server-side HTTP 404 for unknown page routes. |
| 14 | Neutral Suite/Pick’ems loading, visible module retry recovery, and guarded Team Hub entry initialization. |
| 15 | My teams versus read-only Owner inspection, division/season/access labels, search/division filters, legacy opt-in. No registrations removed. |
| 16 | Compact interior heroes and Suite chrome; expandable roster provenance; redundant profile names visually condensed. |
| 17 | Route-specific titles and parent context; UFB/long-guide section search/jump links; operational notes folded without removing documentation. |
| 18 | Collapsed Wheel event management and authorized BYOT creation controls; existing save/publish validation retained. |

## Verification

- Complete automated suite: 249 tests passed, including isolated permission, ballot-write, result/correction, private playbook and game replay tests.
- UFB route, guide, navigation and asset integrity check passed.
- Publication tests copy and byte-verify all 441 public files; internal configuration, source functions, documentation and scripts remain outside public assets.
- Read-only synthetic browser preview: Suite open → results → reload → Back; mobile focus cycle/Escape; saved ballot plus cross-frame timezone change; current/archive card options and image availability; collapsed Wheel management/session copy; team chooser grouping/search; UFB section navigation.
- Public route smoke check: Home, League, unsupported archive, Players, schedule, four game wrappers, house tracker, UFB, Team Hub and missing route.
- Responsive Suite checks at 390 / 768 / 1280 / 1536 in classic / vintage / dark: full header retained and no document-level horizontal overflow.

## Boundaries

No migration, roster, official score, permission grant, collector cadence, bot binding, secret, game physics or public registration changes. No live ballots, results, playbooks or events were submitted during QA. Physical-device gestures, fresh OAuth and a full live member/admin account-switching test were not performed; those authority boundaries are covered by isolated automated tests. Publication/deployment must be confirmed separately after merge.
