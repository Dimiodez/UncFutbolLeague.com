# Private live-site League Suite

Entry: /league-suite, linked under League after the signed-in role/access check. Owner only by default. Owner checkbox enables/revokes website administrator testing; managers, players and public visitors never gain access. Every suite page, static asset and namespaced API rechecks the server session. Responses are private/no-store.

Data boundary: live Discord identity is authenticated against the production DB. Only the access setting is stored there. Suite data APIs use the separate LEAGUE_SUITE_DB binding to the existing preview database, retaining the 6v6 and eight-game 10v10 tests. Public standings, real league registration, existing live team hubs and the bot remain unchanged. The separate preview collector continues running automatically. Manual correction history retains original EA data for comparison.

The suite is a private test environment on the live domain, NOT a publication of test results as official competitions. Frontend calls are namespaced /api/league-suite; preview runtime authentication receives a server-controlled actor only after the live access gate. Browser headers cannot supply the actor. Owner and optionally admins can save test drafts with the live Discord login.

Suite source is mechanically vendored with scripts/vendor-league-suite.mjs from the verified preview branch. No credentials/database contents are copied into source. Runtime backend is excluded from public publication; the separate assets folder is guarded by a Pages Function for every request.

Verification: owner/default-deny/admin-toggle/revocation/member-denial/CSRF/no-store tests; public publication controls; live team-hub security tests. A pre-existing spotlight test assumed an empty season and was updated to accept its populated-results state as well. No production spotlight logic was changed.
