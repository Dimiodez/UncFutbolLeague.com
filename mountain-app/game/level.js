export const WORLD = Object.freeze({ width: 960, height: 720 });
export const FALL_DEATH_Y = WORLD.height + 26;

export const PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 920, direction: -1 },
  { x: 550, y: 590, width: 780, direction: -1 },
  { x: 430, y: 490, width: 780, direction: 1 },
  { x: 550, y: 390, width: 780, direction: -1 },
  { x: 430, y: 290, width: 780, direction: 1 },
  { x: 520, y: 190, width: 720, direction: -1 },
]);

export const LADDERS = Object.freeze([
  { x: 770, top: 590, bottom: 690 },
  { x: 190, top: 490, bottom: 590 },
  { x: 740, top: 390, bottom: 490 },
  { x: 220, top: 290, bottom: 390 },
  { x: 700, top: 190, bottom: 290 },
]);

// Runtime disruption data is authored as graph edges. Visual pieces may only
// break when CourseSafety confirms another complete physical route remains.
export const LEVEL_ONE_ROUTE = Object.freeze({
  start: 'platform-0',
  summit: 'platform-5',
  nodes: Object.freeze(PLATFORMS.map((_platform, index) => `platform-${index}`)),
  edges: Object.freeze(LADDERS.map((_ladder, index) => Object.freeze({
    id: `ladder-${index}`,
    from: `platform-${index}`,
    to: `platform-${index + 1}`,
    type: 'ladder',
  }))),
});

export const LEVEL_ONE_DISRUPTIONS = Object.freeze(LADDERS.map((_ladder, index) => Object.freeze({
  id: `break-ladder-${index}`,
  kind: 'ladder-break',
  disableEdgeIds: Object.freeze([`ladder-${index}`]),
})));

export const PLAYER_START = Object.freeze({ x: 820, y: 650 });
export const SUMMIT = Object.freeze({ x: 820, y: 150 });

export const TUNING = Object.freeze({
  gravity: 780,
  moveSpeed: 175,
  climbSpeed: 125,
  // A compact hop clears a rolling ball without reaching the platform above.
  jumpSpeed: 230,
  ballDiameter: 30,
  stunMs: 2000,
  puddleEscapeGraceMs: 1200,
  ballSpeed: 125,
  ballInterval: 2850,
  initialBallDelay: 900,
  salmonInterval: 8300,
  salmonLifetime: 9000,
});

// Level 1 -> 2 established the campaign's ball difficulty step. Keep that
// exact linear step for every later level instead of hand-tuning each stage.
export const BALL_PROGRESSION = Object.freeze({
  speedPerLevel: 10,
  intervalReductionPerLevel: 200,
});

export const ballTuningForLevel = (level) => {
  const levelIndex = Math.max(0, Math.floor(level) - 1);
  return {
    ballSpeed: TUNING.ballSpeed + BALL_PROGRESSION.speedPerLevel * levelIndex,
    ballInterval: TUNING.ballInterval - BALL_PROGRESSION.intervalReductionPerLevel * levelIndex,
  };
};

const LEVEL_TWO_PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 920, direction: -1 },
  { x: 540, y: 590, width: 780, direction: -1 },
  { x: 420, y: 490, width: 780, direction: 1 },
  { x: 540, y: 390, width: 780, direction: -1 },
  { x: 420, y: 290, width: 780, direction: 1 },
  { x: 510, y: 190, width: 660, direction: -1 },
]);

const LEVEL_TWO_LADDERS = Object.freeze([
  { x: 680, top: 590, bottom: 690 },
  { x: 230, top: 490, bottom: 590 },
  { x: 700, top: 390, bottom: 490 },
  { x: 260, top: 290, bottom: 390 },
  { x: 680, top: 190, bottom: 290 },
]);

const LEVEL_THREE_PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 920, direction: -1 },
  { x: 520, y: 590, width: 840, direction: 1 },
  { x: 450, y: 490, width: 860, direction: -1 },
  { x: 520, y: 390, width: 840, direction: 1 },
  { x: 420, y: 290, width: 760, direction: -1 },
  { x: 500, y: 190, width: 650, direction: -1 },
]);

// The duplicated ladder links are deliberate: Schwein may destroy one of the
// marked routes without ever making the summit unreachable.
const LEVEL_THREE_LADDERS = Object.freeze([
  { id: 'l3-ladder-0a', x: 620, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l3-ladder-0b', x: 340, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l3-ladder-1', x: 500, top: 490, bottom: 590, fromIndex: 1, toIndex: 2 },
  { id: 'l3-ladder-2a', x: 600, top: 390, bottom: 490, fromIndex: 2, toIndex: 3 },
  { id: 'l3-ladder-2b', x: 350, top: 390, bottom: 490, fromIndex: 2, toIndex: 3 },
  { id: 'l3-ladder-3', x: 420, top: 290, bottom: 390, fromIndex: 3, toIndex: 4 },
  { id: 'l3-ladder-4a', x: 650, top: 190, bottom: 290, fromIndex: 4, toIndex: 5 },
  { id: 'l3-ladder-4b', x: 350, top: 190, bottom: 290, fromIndex: 4, toIndex: 5 },
]);

export const LEVEL_THREE_ROUTE = Object.freeze({
  start: 'platform-0',
  summit: 'platform-5',
  nodes: Object.freeze(LEVEL_THREE_PLATFORMS.map((_platform, index) => `platform-${index}`)),
  edges: Object.freeze(LEVEL_THREE_LADDERS.map((ladder) => Object.freeze({
    id: ladder.id,
    from: `platform-${ladder.fromIndex}`,
    to: `platform-${ladder.toIndex}`,
    type: 'ladder',
  }))),
});

export const LEVEL_THREE_DISRUPTIONS = Object.freeze([
  Object.freeze({
    id: 'open-l3-ball-route',
    kind: 'platform-gaps',
    gaps: Object.freeze([
      Object.freeze({ platformIndex: 5, gapX: 560, gapWidth: 96 }),
      Object.freeze({ platformIndex: 4, gapX: 220, gapWidth: 76 }),
      Object.freeze({ platformIndex: 3, gapX: 740, gapWidth: 76 }),
      Object.freeze({ platformIndex: 2, gapX: 220, gapWidth: 76 }),
      Object.freeze({ platformIndex: 1, gapX: 740, gapWidth: 76 }),
    ]),
    disableEdgeIds: Object.freeze([]),
  }),
]);

const LEVEL_FOUR_PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 900, direction: -1, style: 'rock' },
  { x: 250, y: 590, width: 400, direction: 1, style: 'rock' },
  { x: 705, y: 590, width: 410, direction: -1, style: 'snow' },
  { x: 260, y: 490, width: 380, direction: 1, style: 'ice' },
  { x: 710, y: 490, width: 360, direction: -1, style: 'rock' },
  { x: 210, y: 390, width: 300, direction: 1, style: 'rock' },
  { x: 690, y: 390, width: 430, direction: -1, style: 'ice' },
  { x: 210, y: 290, width: 280, direction: 1, style: 'rock' },
  { x: 650, y: 290, width: 500, direction: -1, style: 'snow' },
  { x: 600, y: 190, width: 650, direction: -1, style: 'rock' },
]);

const LEVEL_FOUR_LADDERS = Object.freeze([
  { id: 'l4-ladder-right-start', x: 750, top: 590, bottom: 690, fromIndex: 0, toIndex: 2 },
  { id: 'l4-ladder-left-bridge', x: 330, top: 490, bottom: 590, fromIndex: 1, toIndex: 3 },
  { id: 'l4-ladder-right-bridge', x: 650, top: 490, bottom: 590, fromIndex: 2, toIndex: 4 },
  { id: 'l4-ladder-decoy', x: 200, top: 390, bottom: 490, fromIndex: 3, toIndex: 5 },
  { id: 'l4-ladder-route', x: 700, top: 390, bottom: 490, fromIndex: 4, toIndex: 6 },
  { id: 'l4-ladder-decoy-high', x: 310, top: 290, bottom: 390, fromIndex: 5, toIndex: 7 },
  { id: 'l4-ladder-summit', x: 780, top: 190, bottom: 290, fromIndex: 8, toIndex: 9 },
]);

export const LEVEL_FOUR_ROUTE = Object.freeze({
  start: 'platform-0',
  summit: 'platform-9',
  nodes: Object.freeze(LEVEL_FOUR_PLATFORMS.map((_platform, index) => `platform-${index}`)),
  edges: Object.freeze([
    ...LEVEL_FOUR_LADDERS.map((ladder) => Object.freeze({
      id: ladder.id,
      from: `platform-${ladder.fromIndex}`,
      to: `platform-${ladder.toIndex}`,
      type: 'ladder',
    })),
    Object.freeze({ id: 'l4-bridge-hop', from: 'platform-3', to: 'platform-4', type: 'jump' }),
    Object.freeze({ id: 'l4-decoy-recovery-hop', from: 'platform-7', to: 'platform-8', type: 'jump' }),
  ]),
});

const LEVEL_FIVE_PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 920, direction: -1, style: 'rock' },
  { x: 545, y: 590, width: 790, direction: -1, style: 'snow' },
  { x: 415, y: 490, width: 770, direction: 1, style: 'rock' },
  { x: 550, y: 390, width: 780, direction: -1, style: 'snow' },
  { x: 420, y: 290, width: 760, direction: 1, style: 'rock' },
  { x: 540, y: 190, width: 720, direction: -1, style: 'snow' },
]);

const LEVEL_FIVE_LADDERS = Object.freeze([
  { id: 'l5-ladder-0', x: 260, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l5-ladder-1', x: 740, top: 490, bottom: 590, fromIndex: 1, toIndex: 2 },
  { id: 'l5-ladder-2a', x: 330, top: 390, bottom: 490, fromIndex: 2, toIndex: 3 },
  { id: 'l5-ladder-2b', x: 700, top: 390, bottom: 490, fromIndex: 2, toIndex: 3 },
  { id: 'l5-ladder-3', x: 260, top: 290, bottom: 390, fromIndex: 3, toIndex: 4 },
  { id: 'l5-ladder-4', x: 700, top: 190, bottom: 290, fromIndex: 4, toIndex: 5 },
]);

const LEVEL_FIVE_GAPS = Object.freeze([
  Object.freeze({ platformIndex: 0, gapX: 540, gapWidth: 84 }),
  Object.freeze({ platformIndex: 1, gapX: 500, gapWidth: 86 }),
  Object.freeze({ platformIndex: 3, gapX: 500, gapWidth: 88 }),
  Object.freeze({ platformIndex: 4, gapX: 480, gapWidth: 90 }),
]);

export const LEVEL_FIVE_ROUTE = Object.freeze({
  start: 'platform-0',
  summit: 'platform-5',
  nodes: Object.freeze(LEVEL_FIVE_PLATFORMS.map((_platform, index) => `platform-${index}`)),
  edges: Object.freeze(LEVEL_FIVE_LADDERS.map((ladder) => Object.freeze({
    id: ladder.id,
    from: `platform-${ladder.fromIndex}`,
    to: `platform-${ladder.toIndex}`,
    type: 'ladder',
  }))),
});

const LEVEL_SIX_PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 920, direction: -1, style: 'rock' },
  { x: 480, y: 590, width: 840, direction: 1, style: 'snow' },
  { x: 480, y: 490, width: 880, direction: -1, style: 'rock' },
  { x: 480, y: 390, width: 860, direction: 1, style: 'rock' },
  { x: 480, y: 290, width: 820, direction: -1, style: 'snow' },
  { x: 520, y: 190, width: 720, direction: -1, style: 'rock' },
]);

const LEVEL_SIX_LADDERS = Object.freeze([
  { id: 'l6-ladder-0a', x: 230, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l6-ladder-0b', x: 780, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l6-ladder-1', x: 330, top: 490, bottom: 590, fromIndex: 1, toIndex: 2 },
  { id: 'l6-ladder-2', x: 620, top: 390, bottom: 490, fromIndex: 2, toIndex: 3 },
  { id: 'l6-ladder-3', x: 200, top: 290, bottom: 390, fromIndex: 3, toIndex: 4 },
  { id: 'l6-ladder-4', x: 800, top: 190, bottom: 290, fromIndex: 4, toIndex: 5 },
]);

export const LEVEL_SIX_ROUTE = Object.freeze({
  start: 'platform-0',
  summit: 'platform-5',
  nodes: Object.freeze(LEVEL_SIX_PLATFORMS.map((_platform, index) => `platform-${index}`)),
  edges: Object.freeze(LEVEL_SIX_LADDERS.map((ladder) => Object.freeze({
    id: ladder.id,
    from: `platform-${ladder.fromIndex}`,
    to: `platform-${ladder.toIndex}`,
    type: 'ladder',
  }))),
});

export const LEVEL_SIX_DISRUPTIONS = Object.freeze([
  Object.freeze({
    id: 'l6-splitter-chute',
    kind: 'platform-gaps',
    gaps: Object.freeze([
      Object.freeze({ platformIndex: 5, gapX: 600, gapWidth: 78 }),
      Object.freeze({ platformIndex: 4, gapX: 300, gapWidth: 72 }),
      Object.freeze({ platformIndex: 4, gapX: 700, gapWidth: 72 }),
      Object.freeze({ platformIndex: 3, gapX: 500, gapWidth: 78 }),
      Object.freeze({ platformIndex: 2, gapX: 250, gapWidth: 72 }),
      Object.freeze({ platformIndex: 2, gapX: 730, gapWidth: 72 }),
      Object.freeze({ platformIndex: 1, gapX: 500, gapWidth: 78 }),
    ]),
    spikeDeflectors: Object.freeze([
      Object.freeze({ sourcePlatformIndex: 5, platformIndex: 4, x: 511 }),
    ]),
    disableEdgeIds: Object.freeze([]),
  }),
]);

const LEVEL_SEVEN_PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 920, direction: -1, style: 'rock' },
  { x: 520, y: 590, width: 820, direction: -1, style: 'snow' },
  { x: 450, y: 490, width: 820, direction: 1, style: 'rock' },
  { x: 520, y: 390, width: 840, direction: -1, style: 'snow' },
  { x: 440, y: 290, width: 800, direction: -1, style: 'rock' },
  { x: 550, y: 190, width: 700, direction: -1, style: 'snow' },
]);

const LEVEL_SEVEN_LADDERS = Object.freeze([
  { id: 'l7-ladder-0', x: 170, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l7-ladder-1', x: 760, top: 490, bottom: 590, fromIndex: 1, toIndex: 2 },
  { id: 'l7-ladder-2', x: 210, top: 390, bottom: 490, fromIndex: 2, toIndex: 3 },
  { id: 'l7-ladder-3', x: 720, top: 290, bottom: 390, fromIndex: 3, toIndex: 4 },
  { id: 'l7-ladder-4', x: 260, top: 190, bottom: 290, fromIndex: 4, toIndex: 5 },
]);

const LEVEL_SEVEN_GAPS = Object.freeze([
  Object.freeze({ platformIndex: 5, gapX: 600, gapWidth: 76 }),
  Object.freeze({ platformIndex: 4, gapX: 330, gapWidth: 76 }),
  Object.freeze({ platformIndex: 3, gapX: 300, gapWidth: 76 }),
  Object.freeze({ platformIndex: 2, gapX: 670, gapWidth: 76 }),
  Object.freeze({ platformIndex: 1, gapX: 650, gapWidth: 76 }),
]);

export const LEVEL_SEVEN_ROUTE = Object.freeze({
  start: 'platform-0',
  summit: 'platform-5',
  nodes: Object.freeze(LEVEL_SEVEN_PLATFORMS.map((_platform, index) => `platform-${index}`)),
  edges: Object.freeze(LEVEL_SEVEN_LADDERS.map((ladder) => Object.freeze({
    id: ladder.id,
    from: `platform-${ladder.fromIndex}`,
    to: `platform-${ladder.toIndex}`,
    type: 'ladder',
  }))),
});

const LEVEL_EIGHT_PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 960, direction: -1, style: 'rock' },
  { x: 540, y: 590, width: 800, direction: -1, style: 'snow' },
  { x: 460, y: 490, width: 840, direction: 1, style: 'rock' },
  { x: 480, y: 390, width: 900, direction: -1, style: 'snow' },
  { x: 440, y: 290, width: 880, direction: 1, style: 'rock' },
  { x: 540, y: 190, width: 720, direction: -1, style: 'snow' },
]);

const LEVEL_EIGHT_LADDERS = Object.freeze([
  { id: 'l8-obvious-entry', x: 790, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l8-alternate-entry', x: 170, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l8-ladder-1', x: 230, top: 490, bottom: 590, fromIndex: 1, toIndex: 2 },
  { id: 'l8-ladder-2', x: 720, top: 390, bottom: 490, fromIndex: 2, toIndex: 3 },
  { id: 'l8-ladder-3', x: 240, top: 290, bottom: 390, fromIndex: 3, toIndex: 4 },
  { id: 'l8-ladder-4', x: 700, top: 190, bottom: 290, fromIndex: 4, toIndex: 5 },
]);

export const LEVEL_EIGHT_ROUTE = Object.freeze({
  start: 'platform-0',
  summit: 'platform-5',
  nodes: Object.freeze(LEVEL_EIGHT_PLATFORMS.map((_platform, index) => `platform-${index}`)),
  edges: Object.freeze(LEVEL_EIGHT_LADDERS.map((ladder) => Object.freeze({
    id: ladder.id,
    from: `platform-${ladder.fromIndex}`,
    to: `platform-${ladder.toIndex}`,
    type: 'ladder',
  }))),
});

const LEVEL_EIGHT_GAPS = Object.freeze([
  Object.freeze({ platformIndex: 4, gapX: 620, gapWidth: 78 }),
  Object.freeze({ platformIndex: 3, gapX: 500, gapWidth: 78 }),
  Object.freeze({ platformIndex: 2, gapX: 480, gapWidth: 82 }),
  Object.freeze({ platformIndex: 0, gapX: 520, gapWidth: 84 }),
]);

export function icePatchAt(stage, x, feetY, tolerance = 10) {
  return stage?.icePatches?.find((patch) => {
    const platform = stage.platforms[patch.platformIndex];
    const surfaceY = platform.y - 12;
    return Math.abs(feetY - surfaceY) <= tolerance && Math.abs(x - patch.x) <= patch.width / 2;
  }) || null;
}

const freezeStage = (stage) => Object.freeze({
  ...stage,
  puddles: Object.freeze(stage.puddles.map((puddle) => Object.freeze(puddle))),
  gaps: Object.freeze((stage.gaps || []).map((gap) => Object.freeze(gap))),
  icePatches: Object.freeze((stage.icePatches || []).map((patch) => Object.freeze(patch))),
  ballBumpers: Object.freeze((stage.ballBumpers || []).map((bumper) => Object.freeze(bumper))),
  bizzie: stage.bizzie ? Object.freeze(stage.bizzie) : null,
  tuning: Object.freeze(stage.tuning),
});

export const STAGES = Object.freeze([
  freezeStage({
    level: 1,
    name: 'Base Camp Breakaway',
    platforms: PLATFORMS,
    ladders: LADDERS,
    playerStart: PLAYER_START,
    summit: SUMMIT,
    puddles: [{ x: 390, y: 476 }, { x: 620, y: 576 }],
    ballBumpers: [
      { platformIndex: 4, x: 90, direction: 1 },
      { platformIndex: 3, x: 895, direction: -1 },
      { platformIndex: 2, x: 90, direction: 1 },
      { platformIndex: 1, x: 895, direction: -1 },
    ],
    tuning: {
      ...ballTuningForLevel(1),
      salmonInterval: TUNING.salmonInterval,
    },
  }),
  freezeStage({
    level: 2,
    name: 'Switchback Scramble',
    platforms: LEVEL_TWO_PLATFORMS,
    ladders: LEVEL_TWO_LADDERS,
    playerStart: Object.freeze({ x: 820, y: 650 }),
    summit: Object.freeze({ x: 790, y: 150 }),
    puddles: [{ x: 330, y: 476 }, { x: 650, y: 576 }],
    ballBumpers: [
      { platformIndex: 4, x: 105, direction: 1 },
      { platformIndex: 3, x: 885, direction: -1 },
      { platformIndex: 2, x: 75, direction: 1 },
      { platformIndex: 1, x: 885, direction: -1 },
    ],
    tuning: {
      ...ballTuningForLevel(2),
      salmonInterval: 7800,
    },
  }),
  freezeStage({
    level: 3,
    name: 'Tantrum Traverse',
    platforms: LEVEL_THREE_PLATFORMS,
    ladders: LEVEL_THREE_LADDERS,
    playerStart: Object.freeze({ x: 820, y: 650 }),
    summit: Object.freeze({ x: 790, y: 150 }),
    puddles: [{ x: 560, y: 576 }, { x: 430, y: 376 }],
    route: LEVEL_THREE_ROUTE,
    disruptions: LEVEL_THREE_DISRUPTIONS,
    ballBumpers: [
      { platformIndex: 3, x: 124, direction: 1 },
      { platformIndex: 2, x: 856, direction: -1 },
      { platformIndex: 1, x: 124, direction: 1 },
      { platformIndex: 0, x: 916, direction: -1 },
    ],
    tantrumDelay: 3600,
    tuning: {
      ...ballTuningForLevel(3),
      initialBallDelay: 4700,
      salmonInterval: 7400,
    },
  }),
  freezeStage({
    level: 4,
    name: 'False Summit Pass',
    backgroundKey: 'mountain-pass-sunset',
    platforms: LEVEL_FOUR_PLATFORMS,
    ladders: LEVEL_FOUR_LADDERS,
    playerStart: Object.freeze({ x: 820, y: 650 }),
    summit: Object.freeze({ x: 790, y: 150 }),
    puddles: [{ x: 540, y: 676 }, { x: 330, y: 476 }],
    route: LEVEL_FOUR_ROUTE,
    ballBumpers: [
      { platformIndex: 7, x: 90, direction: 1 },
      { platformIndex: 2, x: 890, direction: -1 },
    ],
    tuning: {
      ...ballTuningForLevel(4),
      salmonInterval: 7000,
    },
  }),
  freezeStage({
    level: 5,
    name: 'Bruce Basin Pursuit',
    backgroundKey: 'mountain-basin-storm',
    platforms: LEVEL_FIVE_PLATFORMS,
    ladders: LEVEL_FIVE_LADDERS,
    playerStart: Object.freeze({ x: 820, y: 650 }),
    summit: Object.freeze({ x: 790, y: 150 }),
    puddles: [{ x: 650, y: 376 }],
    route: LEVEL_FIVE_ROUTE,
    gaps: LEVEL_FIVE_GAPS,
    ballBumpers: [
      { platformIndex: 4, x: 60, direction: 1 },
      { platformIndex: 3, x: 920, direction: -1 },
      { platformIndex: 2, x: 50, direction: 1 },
      { platformIndex: 1, x: 920, direction: -1 },
    ],
    tuning: {
      ...ballTuningForLevel(5),
      salmonInterval: 6600,
    },
  }),
  freezeStage({
    level: 6,
    name: 'Splitter Spike Cirque',
    backgroundKey: 'mountain-cirque-dawn',
    platforms: LEVEL_SIX_PLATFORMS,
    ladders: LEVEL_SIX_LADDERS,
    playerStart: Object.freeze({ x: 820, y: 650 }),
    summit: Object.freeze({ x: 790, y: 150 }),
    puddles: [{ x: 400, y: 676 }],
    route: LEVEL_SIX_ROUTE,
    disruptions: LEVEL_SIX_DISRUPTIONS,
    ballBumpers: [
      { platformIndex: 3, x: 70, direction: 1 },
      { platformIndex: 3, x: 890, direction: -1 },
      { platformIndex: 1, x: 80, direction: 1 },
      { platformIndex: 1, x: 880, direction: -1 },
    ],
    tantrumDelay: 3200,
    tuning: {
      ...ballTuningForLevel(6),
      initialBallDelay: 4500,
      salmonInterval: 6300,
    },
  }),
  freezeStage({
    level: 7,
    name: 'Glacier Lock Run',
    backgroundKey: 'mountain-glacier-day',
    platforms: LEVEL_SEVEN_PLATFORMS,
    ladders: LEVEL_SEVEN_LADDERS,
    playerStart: Object.freeze({ x: 820, y: 650 }),
    summit: Object.freeze({ x: 790, y: 150 }),
    puddles: [{ x: 845, y: 376 }],
    icePatches: [
      { platformIndex: 0, x: 500, width: 170 },
      { platformIndex: 2, x: 450, width: 165 },
      { platformIndex: 4, x: 500, width: 170 },
    ],
    route: LEVEL_SEVEN_ROUTE,
    gaps: LEVEL_SEVEN_GAPS,
    ballBumpers: [
      { platformIndex: 2, x: 70, direction: 1 },
      { platformIndex: 1, x: 860, direction: -1 },
      { platformIndex: 0, x: 80, direction: 1 },
    ],
    tuning: {
      ...ballTuningForLevel(7),
      initialBallDelay: 4300,
      salmonInterval: 6000,
    },
  }),
  freezeStage({
    level: 8,
    name: 'Defender Detour',
    backgroundKey: 'mountain-pass-sunset',
    platforms: LEVEL_EIGHT_PLATFORMS,
    ladders: LEVEL_EIGHT_LADDERS,
    playerStart: Object.freeze({ x: 840, y: 650 }),
    summit: Object.freeze({ x: 790, y: 150 }),
    puddles: [{ x: 500, y: 376 }],
    route: LEVEL_EIGHT_ROUTE,
    gaps: LEVEL_EIGHT_GAPS,
    bizzie: {
      platformIndex: 1,
      x: 500,
      revealDelay: 1300,
      obviousEntryLadderId: 'l8-obvious-entry',
      alternateEntryLadderId: 'l8-alternate-entry',
      onwardLadderId: 'l8-ladder-1',
      ballDeflectionDirection: -1,
    },
    ballBumpers: [
      { platformIndex: 4, x: 45, direction: 1 },
      { platformIndex: 3, x: 900, direction: -1 },
      { platformIndex: 2, x: 55, direction: 1 },
      { platformIndex: 1, x: 900, direction: -1 },
      { platformIndex: 0, x: 15, direction: 1 },
    ],
    tuning: {
      ...ballTuningForLevel(8),
      initialBallDelay: 4100,
      salmonInterval: 5700,
    },
  }),
]);

export const getStage = (level) => STAGES.find((stage) => stage.level === level) || null;
export const hasStage = (level) => getStage(level) !== null;
