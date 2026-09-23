import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../game/GameState.js';
import { chooseSafeDisruption, hasPhysicalRoute, safeDisruptions } from '../game/CourseSafety.js';
import { CAMPAIGN, isTantrumLevel } from '../game/campaign.js';
import { LADDERS, LEVEL_ONE_DISRUPTIONS, LEVEL_ONE_ROUTE, PLATFORMS, TUNING, WORLD } from '../game/level.js';

test('course is a complete alternating climb', () => {
  assert.equal(PLATFORMS.length, 6);
  assert.equal(LADDERS.length, PLATFORMS.length - 1);
  assert.deepEqual(PLATFORMS.slice(1).map(({ direction }) => direction), [-1, 1, -1, 1, -1]);
  for (let index = 1; index < PLATFORMS.length; index += 1) {
    assert.ok(PLATFORMS[index].y < PLATFORMS[index - 1].y, 'each platform rises toward the summit');
  }
});

test('course geometry remains within the fixed arcade viewport', () => {
  for (const platform of PLATFORMS) {
    assert.ok(platform.x - platform.width / 2 >= 0);
    assert.ok(platform.x + platform.width / 2 <= WORLD.width);
    assert.ok(platform.y > 0 && platform.y < WORLD.height);
  }
});

test('jump clears a soccer ball without reaching the next platform row', () => {
  const jumpApex = TUNING.jumpSpeed ** 2 / (2 * TUNING.gravity);
  const smallestPlatformGap = Math.min(
    ...PLATFORMS.slice(1).map((platform, index) => PLATFORMS[index].y - platform.y),
  );
  assert.ok(jumpApex > TUNING.ballDiameter, 'jump must clear a rolling soccer ball');
  assert.ok(jumpApex < smallestPlatformGap * 0.4, 'jump must not reach the platform above');
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

test('tantrums are reserved for spaced future levels', () => {
  assert.equal(CAMPAIGN.totalLevels, 10);
  assert.deepEqual(
    Array.from({ length: CAMPAIGN.totalLevels }, (_value, index) => index + 1).filter(isTantrumLevel),
    [3, 6, 9],
  );
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
