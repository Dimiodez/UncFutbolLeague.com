import { MountainScene } from './game/MountainScene.js';
import { WORLD } from './game/level.js';

const $ = (selector) => document.querySelector(selector);
let scene;
let speechTimer;

function showOverlay(kicker, title, copy, action) {
  $('#overlay').hidden = false;
  $('#overlay-kicker').textContent = kicker;
  $('#overlay-title').innerHTML = title;
  $('#overlay-copy').textContent = copy;
  $('#action').textContent = action;
}

function hideOverlay() { $('#overlay').hidden = true; }

function syncHud() {
  if (!scene) return;
  const { state } = scene;
  $('#altitude').textContent = `${String(state.altitude).padStart(4, '0')} FT`;
  $('#lives').textContent = `${'♥ '.repeat(state.lives)}${'♡ '.repeat(3 - state.lives)}`.trim();
  const status = state.phase === 'playing' && state.isStunned(scene.time.now) ? 'SLIPPED!' : state.phase.toUpperCase();
  $('#status').textContent = status;
  $('#pause').disabled = !['playing', 'paused'].includes(state.phase);
  $('#pause').textContent = state.phase === 'paused' ? 'Resume' : 'Pause';
}

function start() {
  hideOverlay();
  scene.scene.resume();
  scene.startRun();
  $('#game canvas')?.focus({ preventScroll: true });
}

function pause() {
  if (!scene || !['playing', 'paused'].includes(scene.state.phase)) return;
  if (scene.state.phase === 'playing') {
    scene.state.phase = 'paused';
    scene.inputController.clear();
    scene.scene.pause();
    showOverlay('QUICK WATER BREAK', 'HOLD THAT<br>CLIMB.', 'The mountain will still be here.', 'Resume ↗');
  } else {
    scene.state.phase = 'playing';
    scene.scene.resume();
    hideOverlay();
  }
  syncHud();
}

$('#action').addEventListener('click', () => {
  if (!scene) return;
  if (scene.state.phase === 'paused') pause();
  else start();
});
$('#pause').addEventListener('click', pause);
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyP' && !event.repeat) pause();
  if (event.code === 'Space' && ['intro', 'over', 'won'].includes(scene?.state.phase)) start();
});
window.addEventListener('blur', () => { if (scene?.state.phase === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && scene?.state.phase === 'playing') pause(); });

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WORLD.width,
  height: WORLD.height,
  backgroundColor: '#75a8b9',
  pixelArt: true,
  roundPixels: true,
  physics: { default: 'arcade', arcade: { gravity: { y: 780 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MountainScene],
  callbacks: {
    postBoot(game) {
      const canvas = game.canvas;
      canvas.tabIndex = 0;
    },
  },
});

window.addEventListener('load', () => {
  const activeScene = game.scene.getScene('mountain');
  if (activeScene) bindScene(activeScene);
});

function bindScene(activeScene) {
  if (scene) return;
  scene = activeScene;
  scene.events.on('state-change', syncHud);
  scene.events.on('notice', (line) => {
    $('#status').textContent = line;
    window.setTimeout(syncHud, 900);
  });
  scene.events.on('speech', (line) => {
    const bubble = $('#speech-bubble');
    bubble.textContent = line;
    bubble.hidden = false;
    window.clearTimeout(speechTimer);
    speechTimer = window.setTimeout(() => { bubble.hidden = true; }, 1900);
  });
  scene.events.on('game-over', () => showOverlay('SCHWEIN WINS', 'MOUNTAIN<br>DOWN.', 'Three hits. One angry pig. Take another run at the summit.', 'Climb again ↗'));
  scene.events.on('game-won', () => showOverlay('SUMMIT REACHED', 'FC MOUNTAINS<br>FOREVER.', 'You beat Schwein to the peak. Prototype stage cleared.', 'Play again ↗'));
  syncHud();
}

const readyPoll = window.setInterval(() => {
  const activeScene = game.scene.getScene('mountain');
  if (activeScene?.state) {
    window.clearInterval(readyPoll);
    bindScene(activeScene);
  }
}, 30);
