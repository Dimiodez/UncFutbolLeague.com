import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../game/GameState.js';
import { buildBruceRoute } from '../game/BruceDirector.js';
import { projectedBallLandingX } from '../game/HazardDirector.js';
import { chooseSafeDisruption, hasPhysicalRoute, safeDisruptions } from '../game/CourseSafety.js';
import { bruceSpeedForLevel, CAMPAIGN, isBruceLevel, isTantrumLevel } from '../game/campaign.js';
import {
  BALL_PROGRESSION,
  ballTuningForLevel,
  getStage,
  hasStage,
  FALL_DEATH_Y,
  LADDERS,
  LEVEL_ONE_DISRUPTIONS,
  LEVEL_ONE_ROUTE,
  LEVEL_FOUR_ROUTE,
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

test('prototype contains four stages and leaves later mountains unbuilt', () => {
  assert.deepEqual(STAGES.map(({ level }) => level), [1, 2, 3, 4]);
  assert.equal(getStage(2)?.name, 'Switchback Scramble');
  assert.equal(getStage(3)?.name, 'Tantrum Traverse');
  assert.equal(getStage(4)?.name, 'False Summit Pass');
  assert.equal(hasStage(5), false);
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

test('the chase reserves the red card for level ten', () => {
  const state = new GameState();
  assert.equal(state.totalLevels, 10);
  assert.equal(state.level, 1);
  assert.equal(state.summitOutcome(), 'escaped');
  state.level = 10;
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

test('tantrums occur every three levels before the final chase', () => {
  assert.equal(CAMPAIGN.totalLevels, 10);
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

test('Bruce route climbs every platform row before reaching the summit', () => {
  const stage = getStage(3);
  const route = buildBruceRoute(stage);
  assert.equal(route[0].platformIndex, 0);
  assert.equal(route.at(-1).platformIndex, stage.platforms.length - 1);
  assert.equal(route.filter(({ mode }) => mode === 'climb').length, stage.platforms.length - 1);
  route.filter(({ mode }) => mode === 'climb').forEach((waypoint, index) => {
    assert.equal(waypoint.y, stage.platforms[index + 1].y - 12);
  });
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
