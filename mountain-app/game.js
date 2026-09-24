import { MountainScene } from './game/MountainScene.js';
import { hasStage, TUNING, WORLD } from './game/level.js';

const $ = (selector) => document.querySelector(selector);
const previewParams = new URLSearchParams(window.location.search);
const previewLevel = Number(previewParams.get('level'));
const previewCutscene = previewParams.get('cutscene') === '1';
const previewWin = previewParams.get('win') === '1';
let scene;
let speechTimer;
let speechQueue = [];
let speechActive = false;
let queuedLevel = hasStage(previewLevel) ? previewLevel : 1;
let carryLives = false;

function showOverlay(kicker, title, copy, action) {
  $('#overlay').hidden = false;
  $('#overlay-kicker').textContent = kicker;
  $('#overlay-title').innerHTML = title;
  $('#overlay-copy').textContent = copy;
  $('#action').textContent = action;
}

function hideOverlay() { $('#overlay').hidden = true; }

function clearSpeech() {
  window.clearTimeout(speechTimer);
  speechQueue = [];
  speechActive = false;
  $('#speech-bubble').hidden = true;
}

function showNextSpeech() {
  if (speechActive || !speechQueue.length) return;
  speechActive = true;
  const bubble = $('#speech-bubble');
  bubble.textContent = speechQueue.shift();
  bubble.hidden = false;
  speechTimer = window.setTimeout(() => {
    bubble.hidden = true;
    speechActive = false;
    speechTimer = window.setTimeout(showNextSpeech, 180);
  }, 2300);
}

function queueSpeech(line) {
  if (!line || speechQueue.at(-1) === line) return;
  speechQueue.push(line);
  showNextSpeech();
}

function syncHud() {
  if (!scene) return;
  const { state } = scene;
  $('#altitude').textContent = `${String(state.altitude).padStart(4, '0')} FT`;
  $('#lives').textContent = `${'♥ '.repeat(state.lives)}${'♡ '.repeat(Math.max(0, 3 - state.lives))}`.trim();
  const status = state.phase === 'playing' && state.isStunned(scene.time.now) ? 'SLIPPED!' : state.phase.toUpperCase();
  $('#status').textContent = status;
  $('#pause').disabled = !['playing', 'paused'].includes(state.phase);
  $('#pause').textContent = state.phase === 'paused' ? 'Resume' : 'Pause';
}

function start() {
  clearSpeech();
  hideOverlay();
  scene.scene.resume();
  const level = queuedLevel || scene.state.level || 1;
  scene.startRun(level, !carryLives);
  if (previewCutscene && level === 6) {
    window.setTimeout(() => {
      if (scene?.state.isPlaying()) scene.win();
    }, 350);
  }
  if (previewWin && !previewCutscene && level === previewLevel) {
    window.setTimeout(() => {
      if (scene?.state.isPlaying()) scene.win();
    }, 350);
  }
  queuedLevel = null;
  carryLives = false;
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
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  physics: { default: 'arcade', arcade: { gravity: { y: TUNING.gravity }, debug: false } },
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
  if (activeScene?.state) bindScene(activeScene);
});

function bindScene(activeScene) {
  if (scene || !activeScene?.state) return;
  scene = activeScene;
  scene.events.on('state-change', syncHud);
  scene.events.on('notice', (line) => {
    $('#status').textContent = line;
    window.setTimeout(syncHud, 900);
  });
  scene.events.on('speech', (line) => {
    queueSpeech(line);
  });
  scene.events.on('cutscene-start', clearSpeech);
  scene.events.on('game-over', () => {
    queuedLevel = scene.state.level;
    carryLives = false;
    showOverlay('SCHWEIN WINS', 'MOUNTAIN<br>DOWN.', 'No lives left. One angry pig. Take another run at this mountain.', `Retry Level ${scene.state.level} ↗`);
  });
  scene.events.on('game-won', ({ level, totalLevels, nextLevel, outcome, yellowCards, bonusLivesAwarded, lives }) => {
    queuedLevel = nextLevel || level;
    carryLives = Boolean(nextLevel);
    if (bonusLivesAwarded) {
      showOverlay(
        `LEVEL ${level} OF ${totalLevels} CLEARED`,
        'BRUCE<br>BEATEN!',
        `You reached the summit before Bruce. +${bonusLivesAwarded} LIVES — ${lives} lives carry into Level ${nextLevel}. Schwein got away again.`,
        nextLevel ? `Climb Level ${nextLevel} ↗` : `Run Level ${level} again ↗`,
      );
      return;
    }
    if (outcome === 'yellow-card') {
      showOverlay(
        `LEVEL ${level} OF ${totalLevels} CLEARED`,
        'FIRST<br>YELLOW!',
        `Schwein now has ${yellowCards} yellow card. Catch him again for a second yellow — and the automatic red card.`,
        nextLevel ? `Climb Level ${nextLevel} ↗` : `Run Level ${level} again ↗`,
      );
      return;
    }
    showOverlay(
      `LEVEL ${level} OF ${totalLevels} CLEARED`,
      'SCHWEIN<br>ESCAPES!',
      nextLevel
        ? `Schwein fled to Level ${nextLevel}. The referee keeps the remaining lives and continues the chase.`
        : `Level ${level} complete. Schwein escaped toward the unfinished mountains; the red card still waits at Level 10.`,
      nextLevel ? `Climb Level ${nextLevel} ↗` : `Run Level ${level} again ↗`,
    );
  });
  scene.events.on('red-card-won', () => showOverlay(
    'LEVEL 10 CLEARED',
    'RED CARD<br>SCHWEIN!',
    'The referee finally caught the pig captain. Ten mountains. One long-overdue red card.',
    'Play again ↗',
  ));
  syncHud();
}

const readyPoll = window.setInterval(() => {
  const activeScene = game.scene.getScene('mountain');
  if (activeScene?.state) {
    window.clearInterval(readyPoll);
    bindScene(activeScene);
  }
}, 30);
