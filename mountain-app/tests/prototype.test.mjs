import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../game/GameState.js';
import {
  BIZZIE_PLAYER_BLOCKER_HEIGHT,
  nextBizzieDeflection,
} from '../game/BizzieDirector.js';
import { buildBruceRoute } from '../game/BruceDirector.js';
import { canMountLadder, ladderAtFeet } from '../game/LadderNavigation.js';
import { chooseBallDeflection, projectedBallLandingX } from '../game/HazardDirector.js';
import { chooseSafeDisruption, hasPhysicalRoute, safeDisruptions } from '../game/CourseSafety.js';
import {
  ballHitLine,
  BIZZIE_REVEAL_LINE,
  BRUCE_SUMMIT_LINES,
  GAMEPLAY_NOTICES,
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
  LEVEL_THREE_DISRUPTIONS,
  LEVEL_THREE_ROUTE,
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

test('prototype contains eight stages and leaves the final mountains unbuilt', () => {
  assert.deepEqual(STAGES.map(({ level }) => level), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(getStage(2)?.name, 'Switchback Scramble');
  assert.equal(getStage(3)?.name, 'Tantrum Traverse');
  assert.equal(getStage(4)?.name, 'False Summit Pass');
  assert.equal(getStage(5)?.name, 'Bruce Basin Pursuit');
  assert.equal(getStage(6)?.name, 'Splitter Spike Cirque');
  assert.equal(getStage(7)?.name, 'Glacier Lock Run');
  assert.equal(getStage(8)?.name, 'Defender Detour');
  assert.equal(hasStage(8), true);
  assert.equal(hasStage(9), false);
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

test('life state ignores hits during invulnerability and ends after three hits', () => {
  const state = new GameState();
  state.start();
  assert.equal(state.takeHit(1000), true);
  assert.equal(state.lives, 2);
  state.phase = 'playing';
  assert.equal(state.takeHit(1200), false);
  assert.equal(state.takeHit(2600), true);
  state.phase = 'playing';
  assert.equal(state.takeHit(4200), true);
  assert.equal(state.phase, 'over');
  assert.equal(state.lives, 0);
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

test('remaining lives carry into Level 2 but reset on a fresh run', () => {
  const state = new GameState();
  state.start();
  state.lives = 2;
  state.startLevel(2);
  assert.equal(state.level, 2);
  assert.equal(state.lives, 2);
  state.startLevel(2, { resetLives: true });
  assert.equal(state.lives, 3);
});

test('beating Bruce on Level 5 awards the campaign\'s only two bonus lives', () => {
  const state = new GameState();
  state.startLevel(4, { resetLives: true });
  assert.equal(state.awardBruceBonus(false), 0, 'ordinary levels cannot award the bonus');
  state.startLevel(5);
  assert.equal(state.awardBruceBonus(true), 0, 'Bruce reaching the summit first forfeits the bonus');
  assert.equal(state.lives, 3);
  assert.equal(state.awardBruceBonus(false), 2);
  assert.equal(state.lives, 5);
  assert.equal(state.awardBruceBonus(false), 0, 'Level 5 cannot be farmed');
  state.startLevel(10);
  assert.equal(state.awardBruceBonus(false), 0, 'finishing Level 10 cannot award a useless postgame life');
  assert.equal(state.lives, 5);
  assert.deepEqual(state.bruceBonusLevels, [5]);
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
    { from: 3, direction: -1, startX: 300 },
    { from: 2, direction: 1, startX: 670 },
    { from: 1, direction: -1, startX: 650 },
  ];
  falls.forEach(({ from, direction, startX }) => {
    const target = stage.platforms[from - 1];
    const landing = projectedBallLandingX(stage, from, direction, stage.tuning.ballSpeed, TUNING.gravity, startX);
    assert.ok(landing > target.x - target.width / 2 + radius);
    assert.ok(landing < target.x + target.width / 2 - radius);
  });
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
