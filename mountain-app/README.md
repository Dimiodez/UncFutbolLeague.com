# Mountain Mayhem prototype

This directory is intentionally isolated from the UNC Futbol League website. It has no public route, arcade card, leaderboard integration, or production documentation entry.

## Run locally

```powershell
cd mountain-app
node server.mjs
```

Open `http://localhost:4174`.

## Test

```powershell
cd mountain-app
node --test tests/*.test.mjs
```

Phaser 3.90 is pinned in `vendor/` so this prototype has no install step or runtime network dependency.

## Chase structure

The planned game is a ten-level referee chase. Schwein escapes at the summit
of Levels 1–9; the referee gives him the red card at the end of Level 10. Only
Levels 1 through 3 exist in this prototype. The later layouts are intentionally not
implemented while the current art and game feel are being tuned.

Levels 3, 6, and 9 trigger Schwein tantrum events. A tantrum
may drop an authored platform segment or break a ladder only after the pure
`CourseSafety` graph check proves another complete physical route from the
player start to the summit. Level 3's first tantrum breaks one of three
redundant ladders, leaving its alternate climb intact.

Bruce's route runner lives in `game/BruceDirector.js`. He is scheduled every
five levels, moves faster on Level 10, follows the authored ladder route, leaves
temporary sweat puddles, mutters at the summit, and exits the screen. Use
`?level=3&bruce=1` only as a local art/behavior preview before Level 5 exists.

## Character animation assets

The runtime-ready transparent frames live in `assets/sprites/player/`,
`assets/sprites/schwein/`, `assets/sprites/schwein-salmon/`,
`assets/sprites/schwein-run/`, `assets/sprites/ball/`, `assets/sprites/bruce-run/`,
and `assets/sprites/bruce-climb/`. The tantrum frames live in
`assets/sprites/schwein-tantrum/` for route-safe
stages. The painted mountain backdrop is in `assets/environment/`. The `raw/`,
`source/`, and preview PNGs
are retained in this standalone prototype so art iteration can continue
without touching the production website.
