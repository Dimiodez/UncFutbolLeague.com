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
Levels 1 and 2 exist in this prototype. The later layouts are intentionally not
implemented while the current art and game feel are being tuned.

Levels 3, 6, and 9 are reserved for future Schwein tantrum events. A tantrum
may drop an authored platform segment or break a ladder only after the pure
`CourseSafety` graph check proves another complete physical route from the
player start to the summit. Level 1 has one route, so every disruption is
correctly rejected and the mechanic remains inactive here.

## Character animation assets

The runtime-ready transparent frames live in `assets/sprites/player/`,
`assets/sprites/schwein/`, `assets/sprites/schwein-salmon/`,
`assets/sprites/schwein-run/`, and `assets/sprites/ball/`. The tantrum frames
are retained in `assets/sprites/schwein-tantrum/` for those future route-safe
stages. The painted mountain backdrop is in `assets/environment/`. The `raw/`,
`source/`, and preview PNGs
are retained in this standalone prototype so art iteration can continue
without touching the production website.
