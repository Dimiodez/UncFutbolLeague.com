# UNC Futbol League website

Static website for `uncfutbolleague.com`.

## Preview locally

Run the included zero-dependency development server:

```powershell
node dev-server.mjs
```

The `_redirects` file provides single-page route fallback on Cloudflare Pages. Production traffic is canonicalized to `https://www.uncfutbolleague.com` by a Cloudflare Redirect Rule so Discord OAuth host-only cookies remain on one origin.

## Virtual Arena league data

Fixtures, results, standings, team crests, and Pick'ems match data are synced only from UNC Futbol League competition `1`, season `1`:

The Schedules area also includes a recurring BYOT tournament page with flexible team/group counts, a balanced single-table league phase with guaranteed games per team, and qualifying play-ins that always resolve to a valid knockout bracket. Published BYOT draws are public, while its built-in tournament generator and publishing controls are restricted to signed-in owners and administrators.

The public Users directory lists active members by Discord display nickname and shows staff or team titles assigned through the protected Admin clubhouse.

`https://ufl.virtualarena.app/competitions/1/seasons/1/matches`

Run `node scripts/sync-virtual-arena.mjs` to refresh the local snapshot. The GitHub Actions workflow checks the same season four times daily and commits only when the official data changes.

## Before launch

- Add the permanent Discord invitation URL in `app.js`.
- Link the FC27 Season 2 Virtual Arena feeds when the new 6v6 and 10v10 competitions are created.
- Deploy to Cloudflare Pages, verify the preview, then update the GoDaddy `@` and `www` records.
- The production UWU build is bundled under `wheel-app/` and integrated beneath the UFL navigation at `/wheel`. The same-origin frame automatically expands to the application's full content height so the page uses one natural scrollbar.

## Integrated projects

- Unc Wheel United source: `https://github.com/Dimiodez/UncWheelUnited`
- Touchline source: `https://github.com/Dimiodez/Touchline`

`wheel-app/` currently contains the verified production build from Unc Wheel United commit `6ecbcdc`. Rebuild it when the upstream Wheel changes. Touchline requires a persistent Python service and database, so its Pick'em deployment is tracked separately from this static shell.

`pickems-app/` is a focused extraction of Touchline's Pick'em modes from commit `9bbf3fe`. Simple Pick'ems uses production Discord identity and D1-backed shared ballots, scoring, and leaderboards. Season 1 6v6 remains the current competition, with isolated Season 2 6v6 and 10v10 tabs prepared for their future Virtual Arena feeds. Detailed Pick'ems remains bundled but hidden for future use.

## Discord authentication setup

The authentication foundation uses Cloudflare Pages Functions and D1. First login creates a member record using only the Discord ID, username, display name, and avatar. Discord access tokens are not retained.

1. In the Discord Developer Portal, create an application and add this OAuth2 redirect:
   `https://www.uncfutbolleague.com/api/auth/callback`
2. Create a Cloudflare D1 database and apply `migrations/0001_auth.sql`.
3. In the Pages project, bind that database to the variable `DB` for Production and Preview.
4. Add these encrypted Cloudflare secrets/variables:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `OWNER_DISCORD_ID`
5. Redeploy after adding the D1 binding and variables.

Apply `migrations/0008_rate_limits.sql` when provisioning the database. The Function also creates this small table safely on the first limited request if the migration has not been applied yet. Discord login attempts are limited by a one-way hash of the connecting address; Pick’ems ballot updates are limited by authenticated Discord account. Raw connecting addresses are not stored by the application.

FUNC card master layouts use the same `DB` binding and Discord Owner identity. Apply `migrations/0006_func_layout_masters.sql` when provisioning a fresh database. Existing deployments also create these two small tables safely on the first FUNC layout request, so no additional Cloudflare binding, R2 bucket, or environment variable is required.

`OWNER_DISCORD_ID` must be the owner's numeric Discord user ID. The backend derives the owner role from this server-side value on every authenticated request, so another site administrator cannot demote the configured owner. Never commit `.dev.vars`, the Discord client secret, session cookies, or exported member data.

## Arcade
The /arcade hub opens Cleat Arcade at /arcade/cleat. The production game is in arcade-app and follows the site themes with the official UFL logo. The standalone prototype remains separate. Test-level controls are not shipped.
Authenticated runs use same-origin session cookies and a server-generated seed. Small ordered input packets are replayed on the server; no submitted score is trusted. A completed run updates one best per member and game version, with its club abbreviation. Guests can practice and save a device best. This validates game rules but is not bot detection. In-progress runs expire after two hours; interrupted verification falls back to local-only scoring.
Apply migrations/0009_arcade.sql for a fresh database; the endpoint also provisions these tables idempotently. Run node --test scripts/arcade.test.mjs for replay, authorization, and SQL checks.
