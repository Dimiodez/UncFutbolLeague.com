# Scheduled EA collection for the separate test leagues

Both Workers import the same versioned collector from `league-suite-runtime`.
Deploy from this checkout rather than the older workshop checkout, which can
contain unrelated unfinished work. The test database is separate from the
official website's league records.

Apply `migrations/0001_ea_observations.sql` to `ufl-major-update-preview` before
deploying either Worker. This additive migration does not change saved results.
Then deploy `wrangler-6v6.toml` and `wrangler-10v10.toml` with Wrangler.

Also apply `migrations/0002_ea_hosted_feed.sql`. EA can return 403 to Cloudflare
while responding successfully to GitHub-hosted runners; the existing relay can
also fail friendlies. The `EA hosted feed` workflow fetches EA directly and
supplies real, unmodified friendly responses to an authenticated Worker cache.
The Worker remains responsible for fixture matching, review, raw archiving and
accepted stats. No VA scores or stats are used by this transport.

Configure the same randomly generated `EA_FEED_INGEST_KEY` as a GitHub Actions
secret and a 6v6 Worker secret. Never commit or log its value. `/ea-fetch-plan`
and `/ea-feed` fail closed without it. Only clubs in active/missed fixture
windows can be submitted, and submission cannot directly accept a result.
The 10v10 Worker reads the same test-DB cache without exposing an ingest API.

The hosted workflow has staggered retry starts every ten minutes during 00:00–07:59 UTC on Wednesday and Friday, covering Tuesday/Thursday Central matchnights across DST. The first available scheduled job continuously polls every five minutes until 06:55 UTC, capped at 330 minutes to stay below its job timeout. Repeated scheduled starts provide another launch opportunity if a kickoff is missed or a runner stops. A manual monitor remains available for immediate recovery. Concurrency prevents duplicate active transport jobs.

For friendlies, Workers read fresh authenticated hosted data FIRST. They do not issue a known-blocked direct Cloudflare request when current hosted data exists. If the cache is absent or older than 15 minutes they try the direct/relay routes and report failures honestly, never inventing an empty successful feed. Standard GitHub schedules can still be delayed or dropped; repeated starts improve recovery but are not a delivery-time guarantee. The PC, browser and Codex do not need to remain open. Additional matchnights need matching UTC coverage.

The cron runs every five minutes. EA polling uses each saved fixture's window,
15 minutes before the first kickoff through 120 minutes after the last kickoff, with missed-fixture
catch-up every 30 minutes for seven days. This runs without a browser or Codex.
Saved calendars are sufficient for collection if VA is unavailable. For these
current comparison leagues only, VA can refresh the calendar; it never supplies
automatically collected scores or player stats.

Each distinct EA match response is retained in `preview_ea_match_observations`.
The preferred archive can advance to a later complete sheet. It cannot lose an
existing participant, known stat, or valid rating to a less complete response.
Existing archive records are retained as observations before being replaced.
Automatic enrichment cannot replace a staff correction. Repeated polls do not
create duplicate appearances or duplicate copies of the same raw response.

A clean 3–0 or 0–3 is accepted automatically. Such a score requires review if
either team's human-player ratings are missing, invalid, or include 3.0.
Conflicting match candidates still require choosing the correct game. A DNF
flag alone does not put a clean sheet into review.

## October 28 reconciliation baseline

The two current leagues contain all 44 posted VA games. Historical imports and
15 final stat corrections were saved with originals and audit history intact.
All 44 scores, numerical standings values, and 6,193 comparable match-stat cells
agree with VA. No published VA player-match records are missing. This comparison
covers goals, assists, rating, shots, passes attempted/completed, tackles
attempted/won, saves, red cards and MOTM. Real EA participants omitted from VA
remain in our records; matching VA is not a reason to discard them.

This is evidence of the checked fields, not a claim that every VA leaderboard
has the same eligibility rules. VA's selected positions, clean-sheet categories,
manual MOTM choices, posting-order form, and participation thresholds can differ
from our EA-based display. Preserve these distinctions during comparison.

## Next-season acceptance

- Verify scheduled production runs for both formats, feed availability, every
  expected fixture, and all named participants without manual collection.
- Compare the next matchnight against match evidence, recording raw-EA versus
  reviewed values separately. A historical VA correction is not proof that EA
  supplied that corrected value automatically.
- Confirm replacement club IDs before their fixtures. Tenerife's new EA ID was
  still awaiting the owner at the baseline; keep its historical results.
- Confirm the desired leaderboard eligibility, roles and form ordering before
  claiming equivalent rankings. Review synthetic quit scores rather than
  inventing regulation results or unavailable stats.

`scripts/league-collector-integrity.test.mjs` exercises both format pipelines,
including a VA outage, later finalized EA stats, review rules, raw preservation,
repeat polling, and protection of staff corrections.

On October 29 the owner supplied and EA confirmed Tenerife club ID `1996085`.
The existing 6v6 team slot remains `team-1` and its private hub remains `6v6:ITA`.
Its dated `eaClubReplacement` retains Italia club `1663550` for earlier fixtures
and uses Tenerife from October 29 onward. Changing this link never rewrites
accepted results, rosters, manager assignments or tactical boards.

## Publication integrity

Shared browser/server result modules are checked by scripts/check-league-runtime-parity.mjs. The public build refuses to publish if they differ. Update both copies from the same reviewed source; changes to only the runtime collector do not update browser recovery logic. Passing a build is not proof that the live Workers use that commit: verify their deployed bundle separately.

## Independent feed starter (requires activation)

The 6v6 collector's existing Cloudflare timer checks the shared hosted-feed cache for both leagues. If an eligible club's feed is absent or ten minutes old, it can dispatch the existing EA hosted workflow directly. A D1 unique time-bucket lease limits dispatch to one attempt per ten minutes, including overlapping cron invocations. GitHub cron remains a fallback; it is no longer the only starter once this feature is configured. The 10v10 worker does not dispatch duplicate jobs.

Activation requires a fine-grained GitHub credential scoped only to this repository with Actions: write. Store it as the 6v6 Worker secret EA_FEED_DISPATCH_TOKEN; never commit it, paste it into chat, or log it. This adds the ability to start workflow jobs; it does not allow source-code changes. Use GitHub's token settings and Cloudflare's secret entry to provision it after owner approval. Missing/expired credentials and dispatch failures are recorded honestly in preview_collection_runs under __ea_feed_watchdog__ and in worker logs. They do not stop result collection through an already available feed. No schema migration is required.

A successful dispatch is not proof of successful collection. Verify that the hosted job starts, each required club cache becomes fresh, the collector accepts every eligible fixture once, and the page displays those accepted results. An external provider outage or an unavailable runner still needs a visible operational alert. Never label this feature active until the secret is installed and a real dispatch has been verified. Maintain credential expiration as an operational dependency.

Fixtures explicitly held for staff score confirmation stay in review and are excluded from post-window catch-up. This prevents repeated futile upstream requests for a decision that requires staff input. Their live-window evidence collection remains enabled, and other unresolved fixtures continue automatic recovery.

Before recommending migration, complete consecutive unattended matchnights for both formats with all unambiguous EA results and available player statistics captured, no manual job starts or VA score imports, duplicate-free repeat polling, and visible failure/recovery evidence. Administrative forfeits and ambiguous EA quit scores remain explicit staff decisions.
