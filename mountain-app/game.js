import { MountainScene } from './game/MountainScene.js?v=run-leaderboard-1';
import { hasStage, TUNING, WORLD } from './game/level.js?v=run-leaderboard-1';
import { formatRunTime, loadLeaderboard, saveLeaderboardEntry } from './game/leaderboard.js?v=run-leaderboard-1';
import { endScreenForLevel } from './game/Dialogue.js?v=end-screen-copy-1';

const $ = (selector) => document.querySelector(selector);
const previewParams = new URLSearchParams(window.location.search);
const previewLevel = Number(previewParams.get('level'));
const previewCutscene = previewParams.get('cutscene') === '1';
const previewWin = previewParams.get('win') === '1';
const previewPractice = previewParams.get('practice');
let scene;
let speechTimer;
let speechQueue = [];
let speechActive = false;
let queuedLevel = hasStage(previewLevel) ? previewLevel : 1;
let carryCampaign = false;

function showOverlay(kicker, title, copy, action) {
  $('#overlay').hidden = false;
  $('#overlay-kicker').textContent = kicker;
  $('#overlay-title').innerHTML = title;
  $('#overlay-copy').textContent = copy;
  $('#action').textContent = action;
  $('#run-results').hidden = true;
  $('#overlay').classList.remove('overlay--results');
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
  $('#time').textContent = formatRunTime(state.stats.activePlayMs);
  $('#deaths').textContent = String(state.stats.totalDeaths).padStart(2, '0');
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
  const directFinalPreview = level === 10 && !carryCampaign && scene.state.yellowCards === 0;
  scene.startRun(level, !carryCampaign);
  if (directFinalPreview) {
    scene.state.yellowCards = 1;
    scene.state.cardedLevels = [6];
  }
  if (previewPractice && level === previewLevel) scene.startPracticeArea(previewPractice);
  if (previewCutscene && [6, 10].includes(level)) {
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
  carryCampaign = false;
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
  if (event.code === 'Space' && !$('#overlay').hidden && ['intro', 'over', 'won'].includes(scene?.state.phase)) start();
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
    if (['won', 'over', 'cutscene'].includes(scene.state.phase)) return;
    queueSpeech(line);
  });
  scene.events.on('level-finished', clearSpeech);
  scene.events.on('speech-final', (line) => {
    clearSpeech();
    queueSpeech(line);
  });
  scene.events.on('speech-side', (side) => {
    $('#speech-bubble').classList.toggle('speech-bubble--right', side === 'right');
  });
  scene.events.on('cutscene-start', clearSpeech);
  scene.events.on('game-over', () => {
    clearSpeech();
    queuedLevel = scene.state.level;
    carryCampaign = true;
    showOverlay(
      `LEVEL ${scene.state.level} RESET`,
      'THREE STRIKES.<br>CLIMB AGAIN.',
      `The referee keeps the campaign clock and all ${scene.state.stats.totalDeaths} recorded deaths, but this level restarts with three lives.`,
      `Retry Level ${scene.state.level} ↗`,
    );
  });
  scene.events.on('game-won', ({ level, nextLevel, stats }) => {
    queuedLevel = nextLevel || level;
    carryCampaign = Boolean(nextLevel);
    const totals = stats || scene.state.runSummary();
    const screen = endScreenForLevel(level, {
      activeTime: formatRunTime(totals.activePlayMs),
      totalDeaths: totals.totalDeaths,
    });
    showOverlay(screen.kicker, screen.title, screen.text, screen.button);
  });
  scene.events.on('red-card-won', ({ stats }) => {
    queuedLevel = 1;
    carryCampaign = false;
    const result = previewCutscene || previewWin
      ? { entry: { ...stats, completedAt: 'preview' }, entries: loadLeaderboard() }
      : saveLeaderboardEntry(stats);
    const screen = endScreenForLevel(10, {
      activeTime: formatRunTime(stats.activePlayMs),
      totalDeaths: stats.totalDeaths,
    });
    showOverlay(screen.kicker, screen.title, screen.text, screen.button);
    renderLeaderboard(result);
  });
  syncHud();
}

function renderLeaderboard({ entry, entries }) {
  const results = $('#run-results');
  const summary = $('#run-summary');
  const body = $('#leaderboard-body');
  summary.replaceChildren();
  body.replaceChildren();
  const labels = [
    ['ACTIVE TIME', formatRunTime(entry.activePlayMs)],
    ['DEATHS', entry.totalDeaths],
    ['BALLS TO FACE', entry.ballsTakenToFace],
    ['SALMON STRIKES', entry.salmonStrikes],
    ['BRUCE SOCK KNOCKS', entry.bruceSockKnocks],
    ['BIZZIE INTERRUPTIONS', entry.bizzieInterruptions],
  ];
  labels.forEach(([label, value]) => {
    const cell = document.createElement('div');
    const name = document.createElement('span');
    const score = document.createElement('strong');
    name.textContent = label;
    score.textContent = value;
    cell.append(name, score);
    summary.append(cell);
  });
  entries.forEach((run, index) => {
    const row = document.createElement('tr');
    if (run.completedAt === entry.completedAt) row.className = 'current-run';
    [
      index + 1,
      formatRunTime(run.activePlayMs),
      run.totalDeaths,
      run.ballsTakenToFace,
      run.salmonStrikes,
      run.bruceSockKnocks,
      run.bizzieInterruptions,
    ].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    });
    body.append(row);
  });
  results.hidden = false;
  $('#overlay').classList.add('overlay--results');
}

const readyPoll = window.setInterval(() => {
  const activeScene = game.scene.getScene('mountain');
  if (activeScene?.state) {
    window.clearInterval(readyPoll);
    bindScene(activeScene);
  }
}, 30);

window.setInterval(syncHud, 250);
