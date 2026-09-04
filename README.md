# UNC Futbol League website

Static website for `uncfutbolleague.com`.

## Preview locally

Run the included zero-dependency development server:

```powershell
node dev-server.mjs
```

The `_redirects` file provides single-page route fallback on Cloudflare Pages.

## Virtual Arena league data

Fixtures, results, standings, team crests, and Pick'ems match data are synced only from UNC Futbol League competition `1`, season `1`:

`https://ufl.virtualarena.app/competitions/1/seasons/1/matches`

Run `node scripts/sync-virtual-arena.mjs` to refresh the local snapshot. The GitHub Actions workflow checks the same season four times daily and commits only when the official data changes.

## Before launch

- Add the permanent Discord invitation URL in `app.js`.
- Add the FC Sandy Bums and FC Mountains crests when available.
- Connect shared Pick'ems identity, ballots, and scoring before production launch.
- Deploy to Cloudflare Pages, verify the preview, then update the GoDaddy `@` and `www` records.
- The production UWU build is bundled under `wheel-app/` and integrated beneath the UFL navigation at `/wheel`. The same-origin frame automatically expands to the application's full content height so the page uses one natural scrollbar.

## Integrated projects

- Unc Wheel United source: `https://github.com/Dimiodez/UncWheelUnited`
- Touchline source: `https://github.com/Dimiodez/Touchline`

`wheel-app/` currently contains the verified production build from Unc Wheel United commit `6ecbcdc`. Rebuild it when the upstream Wheel changes. Touchline requires a persistent Python service and database, so its Pick'em deployment is tracked separately from this static shell.

`pickems-app/` is a focused extraction of Touchline's Pick'em modes from commit `9bbf3fe`. Only Simple Pick'ems is currently visible; Detailed Pick'ems remains bundled but hidden for future use. The prototype keeps ballots on the current device and excludes Touchline's unrelated league-admin workspaces. Production Discord identity, shared ballots, scoring, and leaderboards still require the planned backend/database deployment.

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

`OWNER_DISCORD_ID` must be the owner's numeric Discord user ID. The backend derives the owner role from this server-side value on every authenticated request, so another site administrator cannot demote the configured owner. Never commit `.dev.vars`, the Discord client secret, session cookies, or exported member data.
