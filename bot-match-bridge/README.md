# Private UFL EA Match Center bridge

Production Pages uses the `UFB_BOT` service binding to call `unc-ufl-match-bridge`.
This Worker has no public route, workers.dev endpoint, or preview URL.

Website endpoints retain owner/admin session checks. The bridge reads only active,
EA-linked teams in the configured Discord guild's `ufl-season-2-6v6` and
`ufl-season-2-10v10` leagues. House teams and unlinked teams are excluded.
The existing match-center configuration calls the guild scope `channelId`;
`1520080337806299181` is the bot league guild scope, not a Discord event listener.

Recent league/playoff matches come from the bot's configured EA relay. Results
are post-match recovery data, not automatically confirmed official fixtures.
Partial feed failures are labelled. This integration does not change bot teams,
Discord registrations, website rosters, or Virtual Arena results.

Deploy the bridge first, then production Pages using the root `wrangler.toml`.
`.assetsignore` excludes this directory and deployment configuration from static
website assets. No secrets belong in these files.

Tests: `node --test scripts/bot-match-bridge.test.mjs scripts/ea-match-center.test.mjs`.
After deployment, sign in as owner/admin and verify `/admin?tab=ea-matches`.
