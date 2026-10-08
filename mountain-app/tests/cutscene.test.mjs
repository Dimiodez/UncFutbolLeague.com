import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../game/GameState.js';
import { LEVEL_TEN_CUTSCENE } from '../game/Dialogue.js';

// Exercise scene sequencing without requiring a renderer in Node.
globalThis.Phaser = { Scene: class {} };
const { MountainScene } = await import('../game/MountainScene.js');

function cutsceneHarness() {
  const scene = new MountainScene();
  const objects = [];
  const callbacks = new Map();
  const emitted = [];
  const tweens = [];
  const makeObject = (kind, x, y, text) => {
    const object = { kind, x, y, text, visible: true, handlers: {} };
    for (const method of ['setOrigin', 'setDisplaySize', 'setStrokeStyle', 'setAngle',
      'setInteractive', 'disableInteractive', 'setDepth', 'clear', 'fillStyle',
      'fillRoundedRect', 'lineStyle', 'strokeRoundedRect', 'fillTriangle', 'lineBetween',
      'setFlipX', 'play']) object[method] = () => object;
    object.setText = (value) => { object.text = value; return object; };
    object.setVisible = (value) => { object.visible = value; return object; };
    object.setY = (value) => { object.y = value; return object; };
    object.on = (event, handler) => { object.handlers[event] = handler; return object; };
    object.destroy = () => { object.destroyed = true; };
    objects.push(object);
    return object;
  };
  scene.add = Object.fromEntries(['rectangle', 'text', 'sprite', 'graphics', 'container']
    .map((kind) => [kind, (...args) => makeObject(kind, ...args)]));
  scene.state = new GameState();
  scene.state.startLevel(10);
  scene.events = { emit: (...args) => emitted.push(args) };
  scene.input = { keyboard: {
    on: (event, handler) => callbacks.set(event, handler),
    off: (event) => callbacks.delete(event),
  } };
  scene.tweens = { add: (config) => {
    const tween = { ...config, stop() {} };
    tweens.push(tween);
    return tween;
  } };
  scene.schwein = makeObject('actor');
  scene.playerArt = makeObject('actor');
  return { scene, objects, callbacks, emitted, tweens };
}

test('finished levels reject late gameplay speech', () => {
  const { scene, emitted } = cutsceneHarness();
  scene.say('playing line');
  for (const phase of ['won', 'over', 'cutscene']) {
    scene.state.phase = phase;
    scene.say('stale ball line');
  }
  assert.deepEqual(emitted, [['speech', 'playing line']]);
});

test('finale advances through the full script, raises red, and finishes only after the exit', () => {
  const { scene, objects, callbacks, emitted, tweens } = cutsceneHarness();
  scene.playRedCardCutscene('red-card');
  const line = objects.find((object) => object.kind === 'text' && object.y === 270);
  const speaker = objects.find((object) => object.kind === 'text' && object.y === 165);
  const card = objects.find((object) => object.kind === 'rectangle' && object.x === 335);
  const next = objects.find((object) => object.text === 'Next →');
  assert.equal(scene.state.phase, 'cutscene');
  scene.state.tick(5000);
  assert.equal(scene.state.stats.activePlayMs, 0, 'reading must not count as active play');
  callbacks.get('keydown-SPACE')({ repeat: true });
  assert.equal(line.text, `“${LEVEL_TEN_CUTSCENE[0].line}”`);
  LEVEL_TEN_CUTSCENE.forEach((beat, index) => {
    assert.equal(line.text, `“${beat.line}”`);
    assert.equal(speaker.text, beat.speaker === 'referee' ? 'REFEREE' : 'SCHWEIN');
    assert.equal(card.visible, index >= 7);
    if (index < LEVEL_TEN_CUTSCENE.length - 1) callbacks.get('keydown-SPACE')({ repeat: false });
  });
  assert.ok(!emitted.some(([event]) => event === 'red-card-won'));
  next.handlers.pointerdown();
  const exit = tweens.at(-1);
  assert.equal(exit.x, 1130);
  exit.onComplete();
  assert.equal(scene.state.phase, 'won');
  assert.equal(callbacks.has('keydown-SPACE'), false);
  assert.equal(emitted.filter(([event]) => event === 'red-card-won').length, 1);
});
