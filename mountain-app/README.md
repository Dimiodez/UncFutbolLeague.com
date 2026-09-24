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

Soccer-ball pressure follows one predictable campaign curve: each level adds
10 to rolling speed and removes 200 ms from the throw interval, matching the
original Level 1 to Level 2 increase all the way through Level 10.

Levels 3, 6, and 9 trigger Schwein tantrum events. Level 3 uses a deterministic
early tantrum: Schwein jumps twice, shakes the screen, and punches three fixed
openings through the summit and alternating lower platforms before the first
ball arrives. The gaps avoid every ladder, so both authored climb routes remain
usable while requiring extra jumps. Balls receive no midair steering or random
branch direction: staggered, extended platforms physically catch their existing
momentum, and each landing resumes the level's deterministic alternating roll.

Bruce's route runner lives in `game/BruceDirector.js`. He is scheduled every
five levels, moves faster on Level 10, follows the authored ladder route, leaves
temporary sweat puddles, mutters at the summit, and exits the screen. Use
the normal campaign schedule once Level 5 exists; Bruce cannot appear on Level 3.

## Character animation assets

The runtime-ready transparent frames live in `assets/sprites/player/`,
`assets/sprites/schwein-green/`, `assets/sprites/schwein-salmon-green/`,
`assets/sprites/schwein-run-green/`, `assets/sprites/ball/`, `assets/sprites/bruce-run/`,
and `assets/sprites/bruce-climb/`. The tantrum frames live in
`assets/sprites/schwein-tantrum-green/` for route-safe
stages. The painted mountain backdrop is in `assets/environment/`. The `raw/`,
`source/`, and preview PNGs
are retained in this standalone prototype so art iteration can continue
without touching the production website.
