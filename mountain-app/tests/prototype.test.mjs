import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState, HIT_INVULNERABILITY_MS } from '../game/GameState.js';
import {
  BIZZIE_PLAYER_BLOCKER_HEIGHT,
  BIZZIE_PLAYER_BLOCKER_WIDTH,
  nextBizzieDeflection,
} from '../game/BizzieDirector.js';
import { buildBruceDescentRoute, buildBruceRoute } from '../game/BruceDirector.js';
import { canMountLadder, ladderAtFeet } from '../game/LadderNavigation.js';
import { formatRunTime, sortLeaderboardEntries } from '../game/leaderboard.js';
import { chooseBallDeflection, isInsideRespawnClearance, projectedBallLandingX } from '../game/HazardDirector.js';
import { chooseSafeDisruption, hasPhysicalRoute, safeDisruptions } from '../game/CourseSafety.js';
import {
  ballHitLine,
  BIZZIE_REVEAL_LINE,
  BRUCE_SUMMIT_LINES,
  endScreenForLevel,
  GAMEPLAY_NOTICES,
  LEVEL_END_SCREENS,
  LEVEL_TEN_CUTSCENE,
  openingLineForLevel,
  SCHWEIN_BALL_HIT_LINES,
  SCHWEIN_BALL_LINES,
  SCHWEIN_BRUCE_SWEAT_LINE,
  SCHWEIN_FALL_LINES,
  SCHWEIN_OPENINGS,
  SCHWEIN_RED_CARD_LINES,
  SCHWEIN_SALMON_LINES,
  SCHWEIN_SUMMIT_LINES,
  SCHWEIN_TANTRUM_LINES,
} from '../game/Dialogue.js';
import {
  bruceSpeedForLevel,
  CAMPAIGN,
  iceRuleForLevel,
  isBruceLevel,
  isTantrumLevel,
} from '../game/campaign.js';
import {
  BALL_PROGRESSION,
  ballTuningForLevel,
  getStage,
  hasReachedSummit,
  hasStage,
  icePatchAt,
  FALL_DEATH_Y,
  LADDERS,
  LEVEL_ONE_DISRUPTIONS,
  LEVEL_ONE_ROUTE,
  LEVEL_FOUR_ROUTE,
  LEVEL_FIVE_ROUTE,
  LEVEL_SIX_DISRUPTIONS,
  LEVEL_SIX_ROUTE,
  LEVEL_SEVEN_ROUTE,
  LEVEL_EIGHT_ROUTE,
  LEVEL_NINE_DISRUPTIONS,
  LEVEL_NINE_ROUTE,
  LEVEL_THREE_DISRUPTIONS,
  LEVEL_THREE_ROUTE,
  LEVEL_TEN_ROUTE,
  PLATFORMS,
  STAGES,
  TUNING,
  WORLD,
} from '../game/level.js';

test('course is a complete alternating climb', () => {
  assert.equal(PLATFORMS.length, 6);
  assert.equal(LADDERS.length, PLATFORMS.length - 1);
  assert.deepEqual(PLATFORMS.slice(1).map(({ direction }) => direction), [-1, 1, -1, 1, -1]);
  for (let index = 1; index < PLATFORMS.length; index += 1) {
    assert.ok(PLATFORMS[index].y < PLATFORMS[index - 1].y, 'each platform rises toward the summit');
  }
});

test('course geometry remains within the fixed arcade viewport', () => {
  for (const stage of STAGES) {
    assert.ok(stage.route ? hasPhysicalRoute(stage.route) : stage.ladders.length >= stage.platforms.length - 1);
    for (const platform of stage.platforms) {
      assert.ok(platform.x - platform.width / 2 >= 0);
      assert.ok(platform.x + platform.width / 2 <= WORLD.width);
      assert.ok(platform.y > 0 && platform.y < WORLD.height);
    }
    stage.ladders.forEach((ladder) => {
      const lowerIndex = Number.isInteger(ladder.fromIndex)
        ? ladder.fromIndex
        : stage.platforms.findIndex((platform) => platform.y === ladder.bottom);
      const upperIndex = Number.isInteger(ladder.toIndex) ? ladder.toIndex : lowerIndex + 1;
      const lower = stage.platforms[lowerIndex];
      const upper = stage.platforms[upperIndex];
      assert.equal(ladder.bottom, lower.y);
      assert.equal(ladder.top, upper.y);
      assert.ok(Math.abs(ladder.x - lower.x) < lower.width / 2);
      assert.ok(Math.abs(ladder.x - upper.x) < upper.width / 2);
    });
  }
});

test('every authored ladder can be entered from the platform above or below', () => {
  for (const stage of STAGES) {
    stage.ladders.forEach((ladder) => {
      const lowerIndex = Number.isInteger(ladder.fromIndex)
        ? ladder.fromIndex
        : stage.platforms.findIndex((platform) => platform.y === ladder.bottom);
      const upperIndex = Number.isInteger(ladder.toIndex) ? ladder.toIndex : lowerIndex + 1;
      const runtimeLadder = { ...ladder, top: ladder.top + 8, bottom: ladder.bottom - 8 };
      const upperFeetY = stage.platforms[upperIndex].y - 12;
      const lowerFeetY = stage.platforms[lowerIndex].y - 12;
      assert.equal(ladderAtFeet([runtimeLadder], ladder.x, upperFeetY), runtimeLadder);
      assert.equal(ladderAtFeet([runtimeLadder], ladder.x, lowerFeetY), runtimeLadder);
      assert.equal(ladderAtFeet([runtimeLadder], ladder.x + 40, upperFeetY), null);
      assert.equal(canMountLadder(runtimeLadder, lowerFeetY, -1), true);
      assert.equal(canMountLadder(runtimeLadder, lowerFeetY, 1), false);
      assert.equal(canMountLadder(runtimeLadder, upperFeetY, 1), true);
      assert.equal(canMountLadder(runtimeLadder, upperFeetY, -1), false);
    });
  }
});

test('prototype contains the complete ten-level mountain chase', () => {
  assert.deepEqual(STAGES.map(({ level }) => level), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(getStage(2)?.name, 'Switchback Scramble');
  assert.equal(getStage(3)?.name, 'Tantrum Traverse');
  assert.equal(getStage(4)?.name, 'False Summit Pass');
  assert.equal(getStage(5)?.name, 'Bruce Basin Pursuit');
  assert.equal(getStage(6)?.name, 'Splitter Spike Cirque');
  assert.equal(getStage(7)?.name, 'Glacier Lock Run');
  assert.equal(getStage(8)?.name, 'Defender Detour');
  assert.equal(getStage(9)?.name, 'Avalanche Anger Run');
  assert.equal(getStage(10)?.name, 'Final Whistle Peak');
  assert.equal(hasStage(9), true);
  assert.equal(hasStage(10), true);
});

test('Level 2 is only a modest hazard increase', () => {
  const levelOne = getStage(1).tuning;
  const levelTwo = getStage(2).tuning;
  assert.ok(levelTwo.ballSpeed > levelOne.ballSpeed);
  assert.ok(levelTwo.ballSpeed <= levelOne.ballSpeed * 1.1);
  assert.ok(levelTwo.ballInterval < levelOne.ballInterval);
  assert.ok(levelTwo.ballInterval >= levelOne.ballInterval * 0.9);
  assert.ok(levelTwo.salmonInterval < levelOne.salmonInterval);
});

test('Levels 1 and 2 catch each physical ball fall and reverse it across the next row', () => {
  [getStage(1), getStage(2)].forEach((stage) => {
    let direction = -1;
    for (let from = stage.platforms.length - 1; from > 0; from -= 1) {
      const targetIndex = from - 1;
      const target = stage.platforms[targetIndex];
      const landing = projectedBallLandingX(stage, from, direction, stage.tuning.ballSpeed, TUNING.gravity);
      const safeInset = TUNING.ballDiameter / 2;
      assert.ok(landing >= target.x - target.width / 2 + safeInset, `Level ${stage.level} row ${from} misses left`);
      assert.ok(landing <= target.x + target.width / 2 - safeInset, `Level ${stage.level} row ${from} misses right`);
      if (targetIndex > 0) {
        const bumper = stage.ballBumpers.find(({ platformIndex }) => platformIndex === targetIndex);
        assert.ok(bumper, `Level ${stage.level} row ${targetIndex} needs a visible turn block`);
        assert.ok(Math.abs(landing - bumper.x) < TUNING.ballDiameter / 2, `Level ${stage.level} row ${targetIndex} misses its turn block`);
        direction = bumper.direction;
      }
    }
    assert.deepEqual(stage.ballBumpers.map(({ direction: next }) => next), [1, -1, 1, -1]);
  });
});

test('soccer-ball difficulty uses the same increment through Level 10', () => {
  const levels = Array.from({ length: 10 }, (_value, index) => ballTuningForLevel(index + 1));
  levels.slice(1).forEach((tuning, index) => {
    const previous = levels[index];
    assert.equal(tuning.ballSpeed - previous.ballSpeed, BALL_PROGRESSION.speedPerLevel);
    assert.equal(previous.ballInterval - tuning.ballInterval, BALL_PROGRESSION.intervalReductionPerLevel);
  });

  assert.deepEqual(getStage(3).tuning.ballSpeed, ballTuningForLevel(3).ballSpeed);
  assert.deepEqual(getStage(3).tuning.ballInterval, ballTuningForLevel(3).ballInterval);
});

test('jump clears a soccer ball without reaching the next platform row', () => {
  const jumpApex = TUNING.jumpSpeed ** 2 / (2 * TUNING.gravity);
  const smallestPlatformGap = Math.min(
    ...PLATFORMS.slice(1).map((platform, index) => PLATFORMS[index].y - platform.y),
  );
  assert.ok(jumpApex > TUNING.ballDiameter, 'jump must clear a rolling soccer ball');
  assert.ok(jumpApex < smallestPlatformGap * 0.4, 'jump must not reach the platform above');
});

test('fall-death boundary sits below the screen but before the extended physics floor', () => {
  assert.ok(FALL_DEATH_Y > WORLD.height);
  assert.ok(FALL_DEATH_Y < WORLD.height + 80);
});

test('three accepted deaths reset only the current level', () => {
  const state = new GameState();
  state.start();
  assert.equal(state.takeHit(1000, 'ball'), true);
  assert.equal(state.stats.totalDeaths, 1);
  assert.equal(state.stats.ballsTakenToFace, 1);
  assert.equal(state.lives, 2);
  assert.equal(state.invulnerableUntil, 1000 + HIT_INVULNERABILITY_MS);
  state.phase = 'playing';
  assert.equal(state.takeHit(1200, 'ball'), false);
  assert.equal(state.isInvulnerable(1849), true, 'respawn remains protected after the hurt animation');
  assert.equal(state.takeHit(4199, 'fall'), false);
  assert.equal(state.takeHit(4200, 'fall'), true);
  state.phase = 'playing';
  assert.equal(state.takeHit(7400, 'ball'), true);
  assert.equal(state.phase, 'over');
  assert.equal(state.lives, 0);
  assert.equal(state.stats.totalDeaths, 3);
  assert.equal(state.stats.ballsTakenToFace, 2);
  const elapsed = state.stats.activePlayMs;
  state.startLevel(state.level);
  assert.equal(state.level, 1);
  assert.equal(state.lives, 3);
  assert.equal(state.stats.totalDeaths, 3);
  assert.equal(state.stats.activePlayMs, elapsed);
});

test('respawn clearance removes only balls threatening the reset pocket', () => {
  const spawn = { x: 100, y: 650 };
  assert.equal(isInsideRespawnClearance(210, 650, spawn, 220), true);
  assert.equal(isInsideRespawnClearance(100, 450, spawn, 220), true);
  assert.equal(isInsideRespawnClearance(400, 650, spawn, 220), false);
  assert.equal(isInsideRespawnClearance(100, 390, spawn, 220), false);
});

test('slips last approximately two seconds', () => {
  const state = new GameState();
  state.start();
  state.stun(500, TUNING.stunMs);
  assert.equal(state.isStunned(2499), true);
  assert.equal(state.isStunned(2500), false);
});

test('puddle recovery includes enough time to leave its trigger area', () => {
  const escapeDistance = TUNING.moveSpeed * (TUNING.puddleEscapeGraceMs / 1000);
  assert.ok(escapeDistance > 48, 'escape grace must cover the full puddle width');
});

test('two yellow cards produce the Level 10 red card', () => {
  const state = new GameState();
  assert.equal(state.totalLevels, 10);
  assert.equal(state.level, 1);
  assert.equal(state.summitOutcome(), 'escaped');
  state.startLevel(6);
  assert.equal(state.issueYellowCard(), true);
  assert.equal(state.issueYellowCard(), false, 'the same summit cannot award two cards');
  assert.equal(state.yellowCards, 1);
  assert.equal(state.summitOutcome(), 'yellow-card');
  state.startLevel(10);
  assert.equal(state.issueYellowCard(), true);
  assert.equal(state.yellowCards, 2);
  assert.equal(state.summitOutcome(), 'red-card');
});

test('campaign stats carry between levels and reset only for a fresh run', () => {
  const state = new GameState();
  state.start();
  state.tick(1250);
  state.recordDeath('fall');
  state.startLevel(2);
  assert.equal(state.level, 2);
  assert.equal(state.lives, 3);
  assert.equal(state.stats.activePlayMs, 1250);
  assert.equal(state.stats.totalDeaths, 1);
  state.startLevel(2, { resetRun: true });
  assert.deepEqual(state.runSummary(), {
    activePlayMs: 0,
    totalDeaths: 0,
    ballsTakenToFace: 0,
    salmonStrikes: 0,
    bruceSockKnocks: 0,
    bizzieInterruptions: 0,
  });
});

test('active timer excludes paused, hit, won, and overlay time', () => {
  const state = new GameState();
  state.start();
  state.tick(1000);
  state.phase = 'paused';
  state.tick(5000);
  state.phase = 'hit';
  state.tick(850);
  state.phase = 'won';
  state.tick(9000);
  state.phase = 'playing';
  state.tick(625);
  assert.equal(state.stats.activePlayMs, 1625);
  assert.equal(formatRunTime(state.stats.activePlayMs), '00:01.6');
});

test('funny incident counters stay separate from deaths', () => {
  const state = new GameState();
  state.start();
  state.recordSalmonStrike();
  state.recordBruceSockKnock();
  state.recordBruceSockKnock();
  state.recordBizzieInterruption();
  assert.equal(state.stats.totalDeaths, 0);
  assert.equal(state.stats.salmonStrikes, 1);
  assert.equal(state.stats.bruceSockKnocks, 2);
  assert.equal(state.stats.bizzieInterruptions, 1);
});

test('leaderboard ranks active time first and deaths as the tie-breaker', () => {
  const entries = sortLeaderboardEntries([
    { activePlayMs: 65000, totalDeaths: 1 },
    { activePlayMs: 60000, totalDeaths: 9 },
    { activePlayMs: 65000, totalDeaths: 0 },
  ]);
  assert.deepEqual(entries.map(({ activePlayMs, totalDeaths }) => [activePlayMs, totalDeaths]), [
    [60000, 9],
    [65000, 0],
    [65000, 1],
  ]);
});

test('tantrums occur every three levels before the final chase', () => {
  assert.equal(CAMPAIGN.totalLevels, 10);
  assert.deepEqual(CAMPAIGN.yellowCardLevels, [6, 10]);
  assert.deepEqual(
    Array.from({ length: CAMPAIGN.totalLevels }, (_value, index) => index + 1).filter(isTantrumLevel),
    [3, 6, 9],
  );
});

test('Bruce appears every five levels and accelerates for Level 10', () => {
  assert.deepEqual(
    Array.from({ length: CAMPAIGN.totalLevels }, (_value, index) => index + 1).filter(isBruceLevel),
    [5, 10],
  );
  assert.equal(bruceSpeedForLevel(4), 0);
  assert.ok(bruceSpeedForLevel(10) > bruceSpeedForLevel(5));
});

test('future ice keeps jumping but locks steering on Levels 7 and 9', () => {
  assert.equal(iceRuleForLevel(6), null);
  assert.deepEqual(iceRuleForLevel(7), { coverage: 'partial', jumpAllowed: true, steeringLocked: true });
  assert.deepEqual(iceRuleForLevel(9), {
    coverage: 'full-platform',
    fullPlatformCount: 1,
    jumpAllowed: true,
    steeringLocked: true,
  });
});

test('Bruce route climbs every platform row before reaching the summit', () => {
  const stage = getStage(5);
  const route = buildBruceRoute(stage);
  assert.equal(route[0].platformIndex, 0);
  assert.equal(route.at(-1).platformIndex, stage.platforms.length - 1);
  assert.equal(route.filter(({ mode }) => mode === 'climb').length, stage.platforms.length - 1);
  route.filter(({ mode }) => mode === 'climb').forEach((waypoint, index) => {
    assert.equal(waypoint.y, stage.platforms[index + 1].y - 12);
  });
  assert.equal(route.filter(({ mode }) => mode === 'jump').length, stage.gaps.length);
});

test('Level 3 uses an early deterministic alternating gap route without breaking ladders', () => {
  assert.equal(hasPhysicalRoute(LEVEL_THREE_ROUTE), true);
  assert.equal(safeDisruptions(LEVEL_THREE_ROUTE, LEVEL_THREE_DISRUPTIONS).length, LEVEL_THREE_DISRUPTIONS.length);
  assert.equal(LEVEL_THREE_DISRUPTIONS.length, 1);
  const disruption = LEVEL_THREE_DISRUPTIONS[0];
  assert.equal(disruption.kind, 'platform-gaps');
  assert.deepEqual(disruption.gaps.map(({ platformIndex }) => platformIndex), [5, 4, 3, 2, 1]);
  assert.deepEqual(disruption.disableEdgeIds, []);
  disruption.gaps.forEach((gap) => {
    const touchingLadders = getStage(3).ladders.filter((ladder) => (
      ladder.fromIndex === gap.platformIndex || ladder.toIndex === gap.platformIndex
    ));
    touchingLadders.forEach((ladder) => {
      assert.ok(Math.abs(ladder.x - gap.gapX) > gap.gapWidth / 2 + 20);
    });
  });
  assert.equal(getStage(3).tantrumDelay, 3600);
  assert.ok(getStage(3).tuning.initialBallDelay > getStage(3).tantrumDelay + 650);
  assert.deepEqual(getStage(3).ballBumpers.map(({ direction }) => direction), [1, -1, 1, -1]);
});

test('Level 3 geometry catches unassisted physics falls on every row', () => {
  const stage = getStage(3);
  const gaps = new Map(LEVEL_THREE_DISRUPTIONS[0].gaps.map((gap) => [gap.platformIndex, gap]));
  for (let currentIndex = stage.platforms.length - 1; currentIndex > 0; currentIndex -= 1) {
    const platform = stage.platforms[currentIndex];
    const target = stage.platforms[currentIndex - 1];
    const gap = gaps.get(currentIndex);
    const landingX = projectedBallLandingX(
      stage,
      currentIndex,
      platform.direction,
      stage.tuning.ballSpeed,
      TUNING.gravity,
      gap?.gapX ?? null,
    );
    const safeInset = TUNING.ballDiameter / 2;
    assert.ok(landingX >= target.x - target.width / 2 + safeInset, `row ${currentIndex} lands past the left edge`);
    assert.ok(landingX <= target.x + target.width / 2 - safeInset, `row ${currentIndex} lands past the right edge`);
  }
});

test('each built level adds pressure without making the sabotage gaps unjumpable', () => {
  const one = getStage(1);
  const two = getStage(2);
  const three = getStage(3);
  assert.ok(two.tuning.ballSpeed > one.tuning.ballSpeed);
  assert.ok(three.tuning.ballSpeed > two.tuning.ballSpeed);
  assert.ok(two.tuning.ballInterval < one.tuning.ballInterval);
  assert.ok(three.tuning.ballInterval < two.tuning.ballInterval);
  const maximumJumpTravel = TUNING.moveSpeed * ((2 * TUNING.jumpSpeed) / TUNING.gravity);
  LEVEL_THREE_DISRUPTIONS[0].gaps.forEach(({ gapWidth }) => {
    assert.ok(gapWidth < maximumJumpTravel, `gap ${gapWidth} exceeds jump travel ${maximumJumpTravel}`);
  });
});

test('Level 4 adds a recoverable false route and distinct mountain materials', () => {
  const stage = getStage(4);
  assert.equal(hasPhysicalRoute(LEVEL_FOUR_ROUTE), true);
  assert.equal(stage.backgroundKey, 'mountain-pass-sunset');
  assert.deepEqual(new Set(stage.platforms.map(({ style }) => style)), new Set(['rock', 'snow', 'ice']));
  assert.ok(LEVEL_FOUR_ROUTE.edges.some(({ id, type }) => id === 'l4-decoy-recovery-hop' && type === 'jump'));
  assert.equal(stage.ladders.some(({ id }) => id === 'l4-ladder-left-start'), false);
  assert.equal(stage.ladders.some(({ id }) => id === 'l4-ladder-route-high'), false);
  assert.equal(stage.ladders.find(({ id }) => id === 'l4-ladder-decoy-high').x, 310);
  const jumpTravel = TUNING.moveSpeed * ((2 * TUNING.jumpSpeed) / TUNING.gravity);
  const bridgeGap = stage.platforms[4].x - stage.platforms[4].width / 2
    - (stage.platforms[3].x + stage.platforms[3].width / 2);
  const recoveryGap = stage.platforms[8].x - stage.platforms[8].width / 2
    - (stage.platforms[7].x + stage.platforms[7].width / 2);
  assert.ok(bridgeGap > 0 && bridgeGap < jumpTravel);
  assert.ok(recoveryGap > 0 && recoveryGap < jumpTravel);
  assert.ok(stage.tuning.ballSpeed > getStage(3).tuning.ballSpeed);
  assert.ok(stage.tuning.ballInterval < getStage(3).tuning.ballInterval);
});

test('Level 5 introduces Bruce on a complete route with an evasive ladder choice', () => {
  const stage = getStage(5);
  assert.equal(hasPhysicalRoute(LEVEL_FIVE_ROUTE), true);
  assert.equal(stage.backgroundKey, 'mountain-basin-storm');
  assert.equal(isBruceLevel(stage.level), true);
  assert.equal(isTantrumLevel(stage.level), false);
  assert.equal(stage.ladders.filter(({ fromIndex }) => fromIndex === 2).length, 2);
  assert.deepEqual(stage.gaps.map(({ platformIndex }) => platformIndex), [0, 1, 3, 4]);
  const maximumJumpTravel = TUNING.moveSpeed * ((2 * TUNING.jumpSpeed) / TUNING.gravity);
  stage.gaps.forEach(({ gapX, gapWidth, platformIndex }) => {
    assert.ok(gapWidth < maximumJumpTravel);
    const touchingLadders = stage.ladders.filter((ladder) => (
      ladder.fromIndex === platformIndex || ladder.toIndex === platformIndex
    ));
    touchingLadders.forEach((ladder) => assert.ok(Math.abs(ladder.x - gapX) > gapWidth / 2 + 20));
  });
  assert.ok(stage.tuning.ballSpeed > getStage(4).tuning.ballSpeed);
  assert.ok(stage.tuning.ballInterval < getStage(4).tuning.ballInterval);
});

test('Level 5 gaps create a deterministic physical ball route down every row', () => {
  const stage = getStage(5);
  const radius = TUNING.ballDiameter / 2;
  const gapByPlatform = new Map(stage.gaps.map((gap) => [gap.platformIndex, gap]));
  const falls = [
    { from: 5, direction: -1 },
    { from: 4, direction: 1, startX: gapByPlatform.get(4).gapX },
    { from: 3, direction: -1, startX: gapByPlatform.get(3).gapX },
    { from: 2, direction: 1 },
    { from: 1, direction: -1, startX: gapByPlatform.get(1).gapX },
  ];
  falls.forEach(({ from, direction, startX }) => {
    const target = stage.platforms[from - 1];
    const landingX = projectedBallLandingX(
      stage,
      from,
      direction,
      stage.tuning.ballSpeed,
      TUNING.gravity,
      startX,
    );
    assert.ok(landingX >= target.x - target.width / 2 + radius, `row ${from} lands past the left edge`);
    assert.ok(landingX <= target.x + target.width / 2 - radius, `row ${from} lands past the right edge`);
    const targetGap = gapByPlatform.get(from - 1);
    if (targetGap) assert.ok(Math.abs(landingX - targetGap.gapX) > targetGap.gapWidth / 2 + radius);
  });
  assert.deepEqual(stage.ballBumpers.map(({ direction }) => direction), [1, -1, 1, -1]);
});

test('Level 6 tantrum creates jumpable gaps and a route-safe random splitter', () => {
  const stage = getStage(6);
  const disruption = LEVEL_SIX_DISRUPTIONS[0];
  assert.equal(hasPhysicalRoute(LEVEL_SIX_ROUTE, disruption.disableEdgeIds), true);
  assert.equal(stage.backgroundKey, 'mountain-cirque-dawn');
  assert.equal(isTantrumLevel(stage.level), true);
  assert.equal(isBruceLevel(stage.level), false);
  assert.equal(disruption.spikeDeflectors.length, 1);
  assert.equal(chooseBallDeflection(() => 0.1), -1);
  assert.equal(chooseBallDeflection(() => 0.9), 1);
  const maximumJumpTravel = TUNING.moveSpeed * ((2 * TUNING.jumpSpeed) / TUNING.gravity);
  disruption.gaps.forEach(({ gapX, gapWidth, platformIndex }) => {
    assert.ok(gapWidth < maximumJumpTravel);
    const touchingLadders = stage.ladders.filter((ladder) => (
      ladder.fromIndex === platformIndex || ladder.toIndex === platformIndex
    ));
    touchingLadders.forEach((ladder) => assert.ok(Math.abs(ladder.x - gapX) > gapWidth / 2 + 20));
  });
  assert.ok(stage.tuning.initialBallDelay > stage.tantrumDelay + 650);
});

test('Level 6 spike sits on the first natural landing and both branches stay on course', () => {
  const stage = getStage(6);
  const disruption = LEVEL_SIX_DISRUPTIONS[0];
  const spike = disruption.spikeDeflectors[0];
  const firstGap = disruption.gaps.find(({ platformIndex }) => platformIndex === spike.sourcePlatformIndex);
  const firstLanding = projectedBallLandingX(
    stage,
    spike.sourcePlatformIndex,
    -1,
    stage.tuning.ballSpeed,
    TUNING.gravity,
    firstGap.gapX,
  );
  assert.ok(Math.abs(firstLanding - spike.x) < 2);

  const falls = [
    { from: 4, direction: -1, startX: 300 },
    { from: 4, direction: 1, startX: 700 },
    { from: 3, direction: -1, startX: 500 },
    { from: 3, direction: 1, startX: 500 },
    { from: 2, direction: -1, startX: 250 },
    { from: 2, direction: 1, startX: 730 },
    { from: 1, direction: -1, startX: 500 },
    { from: 1, direction: 1, startX: 500 },
  ];
  falls.forEach(({ from, direction, startX }) => {
    const target = stage.platforms[from - 1];
    const landing = projectedBallLandingX(stage, from, direction, stage.tuning.ballSpeed, TUNING.gravity, startX);
    assert.ok(landing > target.x - target.width / 2 + TUNING.ballDiameter / 2);
    assert.ok(landing < target.x + target.width / 2 - TUNING.ballDiameter / 2);
  });
  assert.deepEqual(stage.ballBumpers.map(({ direction }) => direction), [1, -1, 1, -1]);
});

test('Level 7 introduces partial ice without removing jump or steering recovery', () => {
  const stage = getStage(7);
  assert.equal(hasPhysicalRoute(LEVEL_SEVEN_ROUTE), true);
  assert.equal(stage.backgroundKey, 'mountain-glacier-day');
  assert.equal(isTantrumLevel(stage.level), false);
  assert.equal(isBruceLevel(stage.level), false);
  assert.deepEqual(iceRuleForLevel(stage.level), { coverage: 'partial', jumpAllowed: true, steeringLocked: true });
  assert.equal(stage.icePatches.length, 3);
  stage.icePatches.forEach((patch) => {
    const platform = stage.platforms[patch.platformIndex];
    assert.ok(patch.width < platform.width / 2, 'Level 7 ice must cover only a portion of a platform');
    assert.equal(icePatchAt(stage, patch.x, platform.y - 12), patch);
    assert.equal(icePatchAt(stage, patch.x + patch.width, platform.y - 12), null);
  });
  assert.ok(stage.tuning.ballSpeed > getStage(6).tuning.ballSpeed);
  assert.ok(stage.tuning.ballInterval < getStage(6).tuning.ballInterval);
});

test('Level 7 keeps its ice, gaps, and ladders readable while balls descend every row', () => {
  const stage = getStage(7);
  const radius = TUNING.ballDiameter / 2;
  const falls = [
    { from: 5, direction: -1, startX: 600 },
    { from: 4, direction: -1, startX: 330 },
    { from: 3, direction: 1, startX: 470 },
    { from: 2, direction: 1, startX: 670 },
    { from: 1, direction: -1, startX: 650 },
  ];
  falls.forEach(({ from, direction, startX }) => {
    const target = stage.platforms[from - 1];
    const landing = projectedBallLandingX(stage, from, direction, stage.tuning.ballSpeed, TUNING.gravity, startX);
    assert.ok(landing > target.x - target.width / 2 + radius);
    assert.ok(landing < target.x + target.width / 2 - radius);
  });
  const shelf = stage.platforms[3];
  const shelfTurn = stage.ballBumpers.find((bumper) => bumper.platformIndex === 3);
  const shelfLanding = projectedBallLandingX(stage, 4, -1, stage.tuning.ballSpeed, TUNING.gravity, 330);
  assert.ok(shelfTurn, 'the short left shelf needs a physical return pillar');
  assert.equal(shelfTurn.direction, 1);
  assert.ok(shelfTurn.x > shelf.x - shelf.width / 2 + 15, 'pillar must stand on the shelf');
  assert.ok(shelfTurn.x < shelfLanding - radius, 'ball must land to the right of its return pillar');
  const approachLadder = stage.ladders.find((ladder) => ladder.id === 'l7-ladder-2');
  const shelfGap = stage.gaps.find((gap) => gap.platformIndex === 3);
  assert.ok(approachLadder.x > shelfLanding + radius + 30, 'ladder exits beyond the incoming ball chute');
  assert.ok(approachLadder.x < shelfGap.gapX - shelfGap.gapWidth / 2 - 20, 'ladder exits on solid platform before the new gap');
  const maximumJumpTravel = TUNING.moveSpeed * ((2 * TUNING.jumpSpeed) / TUNING.gravity);
  stage.gaps.forEach(({ gapX, gapWidth, platformIndex }) => {
    assert.ok(gapWidth < maximumJumpTravel);
    stage.ladders.filter((ladder) => (
      ladder.fromIndex === platformIndex || ladder.toIndex === platformIndex
    )).forEach((ladder) => assert.ok(Math.abs(ladder.x - gapX) > gapWidth / 2 + 20));
    stage.icePatches.filter((patch) => patch.platformIndex === platformIndex).forEach((patch) => {
      assert.ok(Math.abs(patch.x - gapX) > patch.width / 2 + gapWidth / 2);
    });
  });
});

test('Level 8 makes Bizzie deny the tempting lane while preserving the harder route', () => {
  const stage = getStage(8);
  assert.equal(hasPhysicalRoute(LEVEL_EIGHT_ROUTE), true);
  assert.equal(hasPhysicalRoute(LEVEL_EIGHT_ROUTE, [stage.bizzie.obviousEntryLadderId]), true);
  assert.equal(isTantrumLevel(stage.level), false);
  assert.equal(isBruceLevel(stage.level), false);
  assert.equal(iceRuleForLevel(stage.level), null);
  assert.equal(stage.bizzie.platformIndex, 1);
  assert.ok(stage.bizzie.telegraphDelay > 0);
  assert.ok(stage.bizzie.revealDelay - stage.bizzie.telegraphDelay >= 1500);

  const obvious = stage.ladders.find(({ id }) => id === stage.bizzie.obviousEntryLadderId);
  const alternate = stage.ladders.find(({ id }) => id === stage.bizzie.alternateEntryLadderId);
  const onward = stage.ladders.find(({ id }) => id === stage.bizzie.onwardLadderId);
  assert.ok(Math.abs(stage.playerStart.x - obvious.x) < Math.abs(stage.playerStart.x - alternate.x));
  assert.ok(onward.x < stage.bizzie.x && stage.bizzie.x < obvious.x);
  assert.ok(alternate.x < stage.bizzie.x, 'alternate entry must arrive on the onward side of Bizzie');

  const jumpApex = TUNING.jumpSpeed ** 2 / (2 * TUNING.gravity);
  const rowClearance = stage.platforms[1].y - stage.platforms[2].y - 24;
  assert.ok(BIZZIE_PLAYER_BLOCKER_HEIGHT > jumpApex, 'Bizzie must be too tall for the compact hop');
  assert.ok(BIZZIE_PLAYER_BLOCKER_HEIGHT < rowClearance, 'Bizzie must not intrude into the platform above');
  assert.equal(nextBizzieDeflection(1), -1);
  assert.equal(nextBizzieDeflection(-1), 1);
  assert.equal('ballDeflectionDirection' in stage.bizzie, false);
  assert.equal(BIZZIE_REVEAL_LINE, "You're not getting through me!");
  assert.deepEqual(stage.tuning.ballSpeed, ballTuningForLevel(8).ballSpeed);
  assert.deepEqual(stage.tuning.ballInterval, ballTuningForLevel(8).ballInterval);
});

test('Level 8 platform breaks form a jumpable player route and a caught ball chute', () => {
  const stage = getStage(8);
  const radius = TUNING.ballDiameter / 2;
  const maximumJumpTravel = TUNING.moveSpeed * ((2 * TUNING.jumpSpeed) / TUNING.gravity);
  assert.deepEqual(stage.gaps.map(({ platformIndex }) => platformIndex), [4, 3, 2, 0]);
  stage.gaps.forEach(({ gapX, gapWidth, platformIndex }) => {
    assert.ok(gapWidth < maximumJumpTravel);
    stage.ladders.filter((ladder) => (
      ladder.fromIndex === platformIndex || ladder.toIndex === platformIndex
    )).forEach((ladder) => assert.ok(Math.abs(ladder.x - gapX) > gapWidth / 2 + 20));
  });

  const exposedLadder = stage.ladders.find(({ id }) => id === 'l8-ladder-2');
  const exposedRowGap = stage.gaps.find(({ platformIndex }) => platformIndex === 3);
  assert.ok(exposedLadder.x > exposedRowGap.gapX + exposedRowGap.gapWidth / 2);
  assert.ok(exposedLadder.x - (exposedRowGap.gapX + exposedRowGap.gapWidth / 2) <= 50);
  stage.puddles.forEach((puddle) => {
    const gap = stage.gaps.find(({ platformIndex }) => (
      Math.abs(stage.platforms[platformIndex].y - 12 - puddle.y) <= 2
    ));
    assert.ok(!gap || Math.abs(puddle.x - gap.gapX) > gap.gapWidth / 2 + 32);
  });

  const falls = [
    { from: 5, direction: -1 },
    { from: 4, direction: 1, startX: 620 },
    { from: 3, direction: -1, startX: 500 },
    { from: 2, direction: 1, startX: 480 },
    { from: 1, direction: -1, startX: 125 },
  ];
  falls.forEach(({ from, direction, startX }) => {
    const target = stage.platforms[from - 1];
    const landing = projectedBallLandingX(stage, from, direction, stage.tuning.ballSpeed, TUNING.gravity, startX);
    assert.ok(landing >= target.x - target.width / 2 + radius, `row ${from} misses left`);
    assert.ok(landing <= target.x + target.width / 2 - radius, `row ${from} misses right`);
  });
});

test('Level 9 reverses the summit, throw direction, and dialogue side', () => {
  const stage = getStage(9);
  assert.equal(hasPhysicalRoute(LEVEL_NINE_ROUTE), true);
  assert.equal(isTantrumLevel(stage.level), true);
  assert.equal(isBruceLevel(stage.level), false);
  assert.equal(stage.speechSide, 'right');
  assert.ok(stage.schwein.x < WORLD.width / 2);
  assert.equal(stage.schwein.flipX, true);
  assert.equal(stage.schwein.throwDirection, 1);
  assert.equal(stage.schwein.x, 203);
  assert.equal(stage.schwein.ballSpawnX, 282);
  assert.equal(stage.schwein.escapeDirection, -1);
  assert.deepEqual(stage.practiceSpawns.finalPlatform, { x: 735, y: 150 });
  assert.equal(stage.summit.side, 'left');
  assert.equal(hasReachedSummit(stage, stage.summit.x, 150), true);
  assert.equal(hasReachedSummit(stage, WORLD.width - 80, 150), false);
  assert.equal(hasReachedSummit(stage, stage.summit.x, 220), false);
  assert.deepEqual(stage.tuning.ballSpeed, ballTuningForLevel(9).ballSpeed);
  assert.deepEqual(stage.tuning.ballInterval, ballTuningForLevel(9).ballInterval);
  assert.equal(stage.tuning.maxBalls, 10);
});

test('Level 9 tantrum drops nine jumpable pieces without cutting its route', () => {
  const stage = getStage(9);
  const disruption = LEVEL_NINE_DISRUPTIONS[0];
  const maximumJumpTravel = TUNING.moveSpeed * ((2 * TUNING.jumpSpeed) / TUNING.gravity);
  assert.equal(hasPhysicalRoute(LEVEL_NINE_ROUTE, disruption.disableEdgeIds), true);
  assert.equal(disruption.gaps.length, 9);
  assert.equal(disruption.spikeDeflectors.length, 1);
  assert.equal(disruption.gaps.some(({ platformIndex }) => platformIndex === 0), false);
  disruption.gaps.forEach(({ gapX, gapWidth, platformIndex }) => {
    assert.ok(gapWidth < maximumJumpTravel);
    stage.ladders.filter((ladder) => (
      ladder.fromIndex === platformIndex || ladder.toIndex === platformIndex
    )).forEach((ladder) => assert.ok(Math.abs(ladder.x - gapX) > gapWidth / 2 + 20));
  });
});

test('Level 9 has one full ice row and a right-moving physical ball chute', () => {
  const stage = getStage(9);
  const patch = stage.icePatches[0];
  assert.deepEqual(iceRuleForLevel(stage.level), {
    coverage: 'full-platform',
    fullPlatformCount: 1,
    jumpAllowed: true,
    steeringLocked: true,
  });
  assert.equal(stage.icePatches.length, 1);
  assert.equal(patch.platformIndex, 0);
  assert.equal(patch.x, stage.platforms[0].x);
  assert.equal(patch.width, stage.platforms[0].width);
  assert.equal(icePatchAt(stage, patch.x, stage.platforms[0].y - 12), patch);

  const radius = TUNING.ballDiameter / 2;
  const falls = [
    { from: 5, direction: 1, startX: 420 },
    { from: 4, direction: -1, startX: 300 },
    { from: 4, direction: 1, startX: 596 },
    { from: 3, direction: 1, startX: 300 },
    { from: 3, direction: -1, startX: 650 },
    { from: 2, direction: -1, startX: 350 },
    { from: 2, direction: 1, startX: 700 },
    { from: 1, direction: 1, startX: 260 },
    { from: 1, direction: -1, startX: 700 },
  ];
  falls.forEach(({ from, direction, startX }) => {
    const target = stage.platforms[from - 1];
    const landing = projectedBallLandingX(stage, from, direction, stage.tuning.ballSpeed, TUNING.gravity, startX);
    assert.ok(landing >= target.x - target.width / 2 + radius, `row ${from} misses left`);
    assert.ok(landing <= target.x + target.width / 2 - radius, `row ${from} misses right`);
  });

  const disruption = LEVEL_NINE_DISRUPTIONS[0];
  const splitter = disruption.spikeDeflectors[0];
  const initialLanding = projectedBallLandingX(stage, 5, 1, stage.tuning.ballSpeed, TUNING.gravity, 420);
  assert.ok(Math.abs(initialLanding - splitter.x) < 2, 'the first fall must physically hit the random splitter');

  const movedLadder = stage.ladders.find(({ id }) => id === 'l9-ladder-3');
  const upperLadder = stage.ladders.find(({ id }) => id === 'l9-ladder-4');
  const rightBranchLanding = projectedBallLandingX(stage, 4, 1, stage.tuning.ballSpeed, TUNING.gravity, 596);
  const rightBranchBumper = stage.ballBumpers.find(({ platformIndex, direction }) => platformIndex === 3 && direction === -1);
  const rightBranchGap = disruption.gaps.find(({ platformIndex, gapX }) => platformIndex === 3 && gapX === 650);
  assert.ok(rightBranchLanding < rightBranchBumper.x);
  assert.ok(rightBranchGap.gapX < rightBranchLanding);
  assert.equal(movedLadder.x, 170, 'the circled upper ladder moves into the left-side slot');
  disruption.gaps
    .filter(({ platformIndex }) => platformIndex === 3 || platformIndex === 4)
    .forEach(({ gapX, gapWidth }) => assert.ok(Math.abs(movedLadder.x - gapX) > gapWidth / 2 + 20));
  assert.ok(upperLadder.x > 596 + 78 / 2, 'the summit ladder sits beyond the upper ball drop');

  const passablePillars = stage.ballBumpers.filter(({ playerPassable }) => playerPassable);
  assert.deepEqual(passablePillars.map(({ platformIndex, x }) => [platformIndex, x]), [
    [4, 925],
    [3, 500],
    [2, 45],
    [2, 915],
  ]);
  assert.equal(passablePillars.find(({ platformIndex }) => platformIndex === 3).reflectIncoming, true);
  assert.deepEqual(passablePillars.filter(({ platformIndex }) => platformIndex === 2).map(({ direction }) => direction), [1, -1]);
});

test('Level 10 builds the mirrored finale from the authored sketch', () => {
  const stage = getStage(10);
  const maximumJumpTravel = TUNING.moveSpeed * ((2 * TUNING.jumpSpeed) / TUNING.gravity);
  assert.equal(stage.backgroundKey, 'mountain-final-summit');
  assert.equal(hasPhysicalRoute(LEVEL_TEN_ROUTE), true);
  assert.equal(stage.playerStart.x, WORLD.width / 2);
  assert.equal(stage.summit.side, 'center');
  assert.equal(hasReachedSummit(stage, stage.summit.x, 150), true);
  assert.equal(hasReachedSummit(stage, stage.summit.x + 100, 150), false);
  assert.equal(stage.schwein.randomThrowDirection, true);
  assert.equal(stage.schwein.ballSpawnX, WORLD.width / 2);
  assert.deepEqual(stage.bruceRuns.map(({ direction }) => direction), ['up', 'down']);
  assert.deepEqual(Object.keys(stage.bizzie.adaptiveChoices), ['left', 'right']);
  assert.deepEqual(stage.bizzie.adaptiveChoices, { left: { x: 120 }, right: { x: 840 } });
  assert.equal(stage.bizzie.slamOnLand, true);
  assert.equal(stage.bizzie.knockDownOnContact, true);
  assert.deepEqual(
    stage.ladders.slice(0, 4).map(({ x }) => x),
    [340, 620, 95, 865],
    'the lower four ladders follow the yellow markup',
  );
  assert.deepEqual(stage.gaps.filter(({ platformIndex }) => platformIndex === 0).map(({ gapX }) => gapX), [50, 910]);
  const base = stage.platforms[0];
  const baseLeft = base.x - base.width / 2;
  const baseRight = base.x + base.width / 2;
  const [leftEdgeGap, rightEdgeGap] = stage.gaps.filter(({ platformIndex }) => platformIndex === 0);
  assert.equal(leftEdgeGap.gapX - leftEdgeGap.gapWidth / 2, baseLeft, 'the left base gap removes the orphan corner ledge');
  assert.equal(rightEdgeGap.gapX + rightEdgeGap.gapWidth / 2, baseRight, 'the right base gap removes the orphan corner ledge');
  assert.equal(stage.ballBumpers.some(({ platformIndex }) => platformIndex === 0), false, 'the deleted base corners have no orphan pillars');
  assert.deepEqual(stage.gaps.filter(({ platformIndex }) => platformIndex === 2).map(({ gapX }) => gapX), [220, 740]);
  assert.deepEqual(stage.gaps.filter(({ platformIndex }) => platformIndex === 3).map(({ gapX }) => gapX), [480]);
  const adaptiveLadders = stage.ladders.slice(2, 4);
  assert.ok(Math.abs(stage.bizzie.adaptiveChoices.left.x - adaptiveLadders[0].x) < BIZZIE_PLAYER_BLOCKER_WIDTH / 2);
  assert.ok(Math.abs(stage.bizzie.adaptiveChoices.right.x - adaptiveLadders[1].x) < BIZZIE_PLAYER_BLOCKER_WIDTH / 2);
  assert.equal(stage.spikeDeflectors.length, 1);
  assert.deepEqual(stage.spikeDeflectors[0], { platformIndex: 2, x: 480 });
  assert.deepEqual(stage.tuning.ballSpeed, ballTuningForLevel(10).ballSpeed);
  assert.deepEqual(stage.tuning.ballInterval, ballTuningForLevel(10).ballInterval);
  stage.gaps.forEach(({ gapX, gapWidth, platformIndex }) => {
    if (platformIndex === 1) assert.ok(gapWidth > maximumJumpTravel, 'the lower branches must not shortcut across');
    else assert.ok(gapWidth < maximumJumpTravel);
    stage.ladders.filter((ladder) => (
      ladder.fromIndex === platformIndex || ladder.toIndex === platformIndex
    )).forEach((ladder) => assert.ok(Math.abs(ladder.x - gapX) > gapWidth / 2 + 20));
  });
});

test('Level 10 gives Bruce one complete ascent and one complete descent', () => {
  const stage = getStage(10);
  const ascent = buildBruceRoute(stage);
  const descent = buildBruceDescentRoute(stage);
  assert.equal(ascent[0].platformIndex, 0);
  assert.equal(ascent.at(-1).platformIndex, stage.platforms.length - 1);
  assert.equal(descent[0].platformIndex, stage.platforms.length - 1);
  assert.equal(descent.at(-1).platformIndex, 0);
  assert.equal(ascent.filter(({ mode }) => mode === 'climb').length, stage.platforms.length - 1);
  assert.equal(descent.filter(({ mode }) => mode === 'climb').length, stage.platforms.length - 1);
  assert.ok(ascent.some(({ mode }) => mode === 'jump'));
  assert.ok(descent.some(({ mode }) => mode === 'jump'));
});

test('Level 4 ball momentum reaches the second-lowest shelf and base', () => {
  const stage = getStage(4);
  const speed = stage.tuning.ballSpeed;
  const radius = TUNING.ballDiameter / 2;
  const project = (startX, direction, fromY, toY) => (
    startX + direction * speed * Math.sqrt((2 * (toY - fromY)) / TUNING.gravity)
  );
  const top = stage.platforms[9];
  const upperLeft = stage.platforms[7];
  const lowerRight = stage.platforms[2];
  const base = stage.platforms[0];
  const upperLanding = project(top.x - top.width / 2 - radius, -1, top.y, upperLeft.y);
  assert.ok(upperLanding > upperLeft.x - upperLeft.width / 2 && upperLanding < upperLeft.x + upperLeft.width / 2);
  const lowerLanding = project(upperLeft.x + upperLeft.width / 2 + radius, 1, upperLeft.y, lowerRight.y);
  assert.ok(lowerLanding > lowerRight.x - lowerRight.width / 2 && lowerLanding < lowerRight.x + lowerRight.width / 2);
  const baseLanding = project(lowerRight.x - lowerRight.width / 2 - radius, -1, lowerRight.y, base.y);
  assert.ok(baseLanding > base.x - base.width / 2 && baseLanding < base.x + base.width / 2);
});

test('Level 1 refuses every break because it has only one physical route', () => {
  assert.equal(hasPhysicalRoute(LEVEL_ONE_ROUTE), true);
  assert.deepEqual(safeDisruptions(LEVEL_ONE_ROUTE, LEVEL_ONE_DISRUPTIONS), []);
  assert.equal(chooseSafeDisruption(LEVEL_ONE_ROUTE, LEVEL_ONE_DISRUPTIONS), null);
});

test('future disruptions may break a ladder or platform half only when a fallback remains', () => {
  const redundantCourse = {
    start: 'start',
    summit: 'summit',
    nodes: ['start', 'left', 'right', 'summit'],
    edges: [
      { id: 'lower-left', from: 'start', to: 'left' },
      { id: 'lower-right', from: 'start', to: 'right' },
      { id: 'ladder-left', from: 'left', to: 'summit' },
      { id: 'ladder-right', from: 'right', to: 'summit' },
    ],
  };
  const candidates = [
    { id: 'drop-left-half', disableEdgeIds: ['lower-left'] },
    { id: 'break-right-ladder', disableEdgeIds: ['ladder-right'] },
    { id: 'destroy-both-routes', disableEdgeIds: ['ladder-left', 'ladder-right'] },
  ];
  assert.deepEqual(safeDisruptions(redundantCourse, candidates).map(({ id }) => id), [
    'drop-left-half',
    'break-right-ladder',
  ]);
  assert.equal(chooseSafeDisruption(redundantCourse, candidates, () => 0.99).id, 'break-right-ladder');
});

test('Schwein has one authored opening for each planned level', () => {
  assert.deepEqual(Object.keys(SCHWEIN_OPENINGS).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(openingLineForLevel(1), 'MAMA MIA... YOU’RE BACK?');
  assert.equal(openingLineForLevel(6), 'MAMA MIA, THIS REF DOESN’T FUCKING QUIT.');
  assert.equal(openingLineForLevel(10), 'COME ON THEN, REF. BRING THAT LITTLE RED CARD UP HERE.');
});

test('dialogue pools retain the complete authored line counts', () => {
  assert.equal(SCHWEIN_BALL_LINES.length, 15);
  assert.equal(SCHWEIN_SALMON_LINES.length, 8);
  assert.equal(SCHWEIN_TANTRUM_LINES.length, 7);
  assert.equal(SCHWEIN_FALL_LINES.length, 6);
  assert.equal(SCHWEIN_SUMMIT_LINES.length, 9);
  assert.equal(SCHWEIN_RED_CARD_LINES.length, 2);
  assert.equal(BRUCE_SUMMIT_LINES.length, 5);
  assert.equal(SCHWEIN_BRUCE_SWEAT_LINE, 'MAN, I BET YOU HOPE THAT’S SWEAT, HUH?... IT’S NOT.');
});

test('all ten levels have their authored escalating end-screen copy', () => {
  assert.equal(Object.keys(LEVEL_END_SCREENS).length, 10);
  assert.deepEqual(
    Array.from({ length: 10 }, (_value, index) => endScreenForLevel(index + 1).button),
    [
      'Climb Level 2 ↗',
      'Climb Level 3 ↗',
      'Climb Level 4 ↗',
      'Climb Level 5 ↗',
      'Climb Level 6 ↗',
      'Climb Level 7 ↗',
      'Climb Level 8 ↗',
      'Climb Level 9 ↗',
      'Climb Level 10 ↗',
      'Play again ↗',
    ],
  );
  assert.match(endScreenForLevel(3).text, /ALRIGHT DICKHEAD, NOW I’M PISSED!/);
  assert.match(endScreenForLevel(5).text, /BRUCE|Bruce/);
  assert.match(endScreenForLevel(6).title, /FIRST/);
  assert.match(endScreenForLevel(8).text, /ME BRICK WALL\. ME STOP BALL\./);
  assert.match(endScreenForLevel(9).text, /THIS IS MY FUCKING MOUNTAIN!/);
  const finale = endScreenForLevel(10, { activeTime: '12:34.5', totalDeaths: 17 });
  assert.match(finale.text, /12:34\.5/);
  assert.match(finale.text, /17 deaths/);
  assert.doesNotMatch(finale.text, /\[ACTIVE TIME\]|\[TOTAL DEATHS\]/);
});

test('soccer-ball hit dialogue uses the requested 70/15/15 weighting', () => {
  assert.deepEqual(SCHWEIN_BALL_HIT_LINES.map(({ chance }) => chance), [0.70, 0.15, 0.15]);
  assert.equal(ballHitLine(() => 0), 'SUCK MY ASS');
  assert.equal(ballHitLine(() => 0.699), 'SUCK MY ASS');
  assert.equal(ballHitLine(() => 0.70), 'THAT’S WHY I’M THE MVP!');
  assert.equal(ballHitLine(() => 0.849), 'THAT’S WHY I’M THE MVP!');
  assert.equal(ballHitLine(() => 0.85), 'LONG BALL RIGHT ON TARGET, DICKHEAD!');
});

test('gameplay notices remain status text rather than character dialogue', () => {
  assert.deepEqual(Object.values(GAMEPLAY_NOTICES), [
    'BRUCE HAS ENTERED THE PREMISES!',
    'BLACK ICE — GOOD LUCK STOPPING!',
    'YOU STEPPED ON A FUCKING SALMON!',
    'BRUCE FORGOT YOU WERE STANDING THERE!',
    'BRUCE RESIDUE DETECTED!',
    'YOU HAVE LOST AN ARGUMENT WITH THE MOUNTAIN!',
    'SCHWEIN ADDED CHAOS TO THE MOUNTAIN!',
  ]);
});

test('the complete Level 10 red-card exchange is stored in speaking order', () => {
  assert.equal(LEVEL_TEN_CUTSCENE.length, 11);
  assert.deepEqual(LEVEL_TEN_CUTSCENE.map(({ speaker }) => speaker), [
    'schwein', 'referee', 'schwein', 'referee', 'schwein', 'referee',
    'schwein', 'referee', 'schwein', 'referee', 'schwein',
  ]);
  assert.equal(LEVEL_TEN_CUTSCENE[0].line, 'MAMA MIA... YOU ACTUALLY MADE IT.');
  assert.equal(LEVEL_TEN_CUTSCENE[8].line, 'MAMA MIA... WHY’S THAT CARD RED?');
  assert.equal(LEVEL_TEN_CUTSCENE.at(-1).line, 'ALRIGHT, DICKHEAD.');
});
