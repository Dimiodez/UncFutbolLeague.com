# Mountain Mayhem

Published through the website Arcade at `/arcade/mountain-mayhem`, with its shared leaderboard on `/arcade` and below the game. Discord members save their best complete ten-level campaign through `/api/mountain/run`; guests can play without saving a shared score.

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

The game is a ten-level referee chase. Schwein escapes at the summit of Levels
1–9; the referee gives him the red card at the end of Level 10. All ten mountain
layouts and the scripted final red-card cutscene are implemented.

Soccer-ball pressure follows one predictable campaign curve: each level adds
10 to rolling speed and removes 200 ms from the throw interval, matching the
original Level 1 to Level 2 increase all the way through Level 10.

Levels 1 and 2 use alternating shelf widths and visible edge blocks to keep
every soccer ball on the mountain. Each physical fall lands beside the next
block, reverses direction, and crosses the player's route before descending
again; the tutorial climb itself remains gap-free.

Levels 3, 6, and 9 trigger Schwein tantrum events. Level 3 uses a deterministic
early tantrum: Schwein jumps twice, shakes the screen, and punches five fixed
openings through the summit and lower platforms before the first ball arrives.
The gaps alternate left and right and avoid every ladder, so both authored climb
routes remain usable while requiring extra jumps. Balls receive no midair
steering or random branch direction: staggered platforms catch their momentum,
then visible edge blocks physically turn them into the next alternating chute.

Level 4 introduces route reading rather than another sabotage. The opening
forces the right-hand climb, then a wider bridge jump leads back toward a false
summit shelf before a short recovery jump reaches the real route. Two tempting
shortcut ladders were deliberately removed so the player must cross the layout. Its
late-afternoon rocky-pass background and mixed rock, ice, and snow ledges are
stage-owned presentation data, so later mountains can use distinct scenery and
platform materials without changing collision behavior.

Level 5 moves into a stormy granite basin and introduces Bruce on schedule. Four
permanent breaks turn the wide ledges into semi-platforms and force short jumps
along the climb. Bruce follows the same physical route and visibly arcs over each
break instead of ignoring it. The middle row offers two valid ladders so the
referee has room to evade him, while alternating physical ball bumpers and the
authored openings carry Schwein's throws down every platform row.

Bruce's route runner lives in `game/BruceDirector.js`. He is scheduled every
five levels, moves faster on Level 10, follows the authored ladder route, leaves
temporary sweat puddles, mutters at the summit, and exits the screen. Use
the normal campaign schedule on Level 5; Bruce cannot appear on Level 3.
Each level starts with three lives. Losing the third life resets only the current
level with three fresh lives; campaign time, total deaths, cards, and incident
counters persist. Bruce remains a route-and-slip threat rather than an
extra-life race.

Levels 7 and 9 reserve the ice mechanic. Jumping remains available, but steering
locks to the entry direction while sliding. Level 7 introduces three bright,
partial ice patches across an alternating gap-and-ladder route; ordinary control
returns as soon as the referee leaves the ice. Level 9 has exactly one fully iced platform.

Level 6 returns to Schwein's tantrum sabotage in a cold dawn cirque. The impact
breaks seven small, jumpable openings across five ledges. The first falling chunk
becomes a low mountain spike at the ball's natural landing point. Each ball that
hits it is independently kicked left or right, then follows one of two complete
physics-driven chutes. Edge blocks only turn the ball inward toward the next gap;
there is no midair steering, and every ladder remains clear of every break.

Reaching the Level 6 summit triggers the first discipline payoff. Gameplay and
hazards stop for a short referee-versus-Schwein cutscene: the referee raises a
yellow card, the two exchange their authored lines, and Schwein runs off. The
campaign state records that yellow; Level 10 is reserved for the second yellow
and therefore the automatic red card.

## Character animation assets

The runtime-ready transparent frames live in `assets/sprites/player/`,
`assets/sprites/schwein-green/`, `assets/sprites/schwein-salmon-green/`,
`assets/sprites/schwein-run-green/`, `assets/sprites/ball/`, `assets/sprites/bruce-run/`,
and `assets/sprites/bruce-climb/`. The tantrum frames live in
`assets/sprites/schwein-tantrum-green/` for route-safe
stages. The stage-specific painted mountain backdrops are in `assets/environment/`. The `raw/`,
`source/`, and preview PNGs
are retained in this standalone prototype so art iteration can continue
without touching the production website.

## Dialogue copy

All current Schwein, Bruce, referee, and gameplay-notice copy is centralized in
`game/Dialogue.js` so future script passes do not require editing gameplay code.
The ten authored level-clear overlays are centralized there as well, including
the final screen's dynamic active-time and total-deaths placeholders.
The complete Level 10 red-card exchange plays in an interactive comic scene, advanced with Space or Next. Characters stay below the bubbles. The referee presents the red card and Schwein runs off before the final results.

## Level 8: Bizzie's defensive detour

Level 8 introduces Bizzie as a non-damaging roadblock. The tempting
right-side entry ladder leaves the referee on the wrong side of his lane-filling
blocking stance; the longer left entry ladder is the guaranteed route onward.
An animated landing marker warns where Bizzie will arrive before his slower
five-frame stomp locks the lane. He cannot be passed or jumped and alternates
colliding soccer balls left and right with a short momentum-preserving ricochet;
gravity then keeps each ball moving down the course instead of neutralizing it.
There is no repeated screen shake or one-sided ball pile. After a lost life,
Bizzie leaves and repeats the warning-and-landing sequence so the alternate path
is never permanently sealed. His line is “You're not
getting through me!” The player can enter every ladder from either end, so a
blocked route can always be backed out of. These changes do not alter the
authored platform route. Four jumpable platform breaks make that alternate route
meaningfully harder and form a caught, physics-driven ball chute. His source artwork, normalized runtime frames, and
preview sheet are kept under `assets/sprites/`.

Ladder mounting is directional on every built and future stage: Up enters from a
ladder's lower platform and Down enters from its upper platform. Pressing Down at
the bottom end can therefore never pull the referee through the mountain floor;
authored bottom-row gaps remain valid jump hazards.

The right-side ladder between the middle rows sits just inside its gap edge,
leaving a usable climbing window after incoming balls roll past. The Level 8
sweat puddle sits on the solid left-hand route rather than inside that gap.

## Level 9: Avalanche Anger Run

Level 9 mirrors the summit presentation: Schwein occupies the left ledge, faces
right, and throws balls into a right-moving physical chute. Dialogue moves to
the right side of the game frame so it stays clear of Schwein and the top-row
mechanics. His scheduled tantrum lands after a short opening window and drops
nine authored platform sections across five rows. The first fall lands on a
physical mountain peak that randomly sends each ball into a left or right
descent lane, so the hazards no longer repeat one predictable course. Every
break remains jumpable, avoids every ladder, and preserves a complete route.

The bottom row is one fully iced platform, as planned for Level 9. Its locked
steering combines with the faster ninth-level ball cadence. The upper-middle
ladder moves from the stacked right route to the isolated left shelf, forcing a
readable cross-course climb. Four small ball-only pillars guard the marked
right, center, and lower edges: the referee passes through them, while balls
reverse and stay on the authored descent lanes. A hit leaves enough visible
respawn invulnerability to escape the next incoming ball instead of immediately
recording another death.

For isolated final-approach tuning, `?level=9&practice=finalPlatform` starts the
referee on the upper-right side after the avalanche gaps appear. This practice
spawn also remains the respawn point after a miss and suppresses salmon so each
attempt isolates the head-on soccer-ball jump; normal Level 9 still starts at
the mountain base with every hazard active. Schwein and his throw origin sit 18
pixels farther right to make the timing readable without changing the
level-wide ball speed or cadence.

## Level 10: Final Whistle Peak

Level 10 translates the hand-drawn finale into a mirrored six-tier boss
mountain. The referee begins at the center of a broad base platform, then chooses
between left and right entry ladders. The marked outer ends are removed from the
base. A wide, deliberately unjumpable opening separates the two lower branches;
the next row has small outer shelves and one joined center, while the row above
has one central jump. The upper row retains three sections before both sides
converge on the central summit ladder.

Bizzie waits for the referee's first committed movement, telegraphs that same
side, and drops onto its small outer shelf directly over that branch's ladder.
His landing shakes the mountain and knocks the referee down without breaking
platforms; touching him while climbing kicks the referee back down the ladder.
The opposite entry remains available from the base. Schwein occupies the centered summit and
chooses a fresh left or right throw direction for each soccer ball. Visible edge
pillars keep both branches on the mountain, while a central peak on the later
middle row randomly returns arriving balls to either lane.

Bruce performs two separate finale runs at Level 10 speed. His first starts
outside the bottom-right edge and climbs to the summit; after exiting, his
second starts at the summit and descends through the mirrored route before
running off the lower-left edge. Both routes use the authored ladders and jump
the same platform seams as the referee. The stage uses
`mountain-final-summit-v1.png`, the storm-ringed final-peak background generated
specifically for this encounter.

## Run timing and shared leaderboard

The campaign clock advances only while `GameState.phase === 'playing'`. Pausing,
switching away from the tab, hit/respawn delays, three-life reset overlays,
level-complete overlays, and card cutscenes do not add time. Stats carry between
levels and through same-level resets, then clear only when a new campaign begins.

Finishing Level 10 shows the campaign summary and saves eligible signed-in runs,
with total deaths as the time tie-breaker. Each result also shows balls taken to the
face, salmon strikes, Bruce collisions or sweat slips, and Bizzie interruptions.
The public leaderboard keeps one best completed campaign per signed-in member, sorted by active time then deaths. Sequential authenticated summit checkpoints, monotonic bounded stats, wall-time checks, rate limits, and atomic completion protect saves. This is casual ranking, not server-side collision replay. Practice/preview runs cannot save shared scores. Public builds ignore development level and cutscene query overrides.
