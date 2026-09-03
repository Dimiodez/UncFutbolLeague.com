# UNC Futbol League website

Static website for `uncfutbolleague.com`.

## Preview locally

Run the included zero-dependency development server:

```powershell
node dev-server.mjs
```

The `_redirects` file provides single-page route fallback on Cloudflare Pages.

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
