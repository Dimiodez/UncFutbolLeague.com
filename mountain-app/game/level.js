export const WORLD = Object.freeze({ width: 960, height: 720 });
export const FALL_DEATH_Y = WORLD.height + 26;

export const PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 880, direction: -1 },
  { x: 520, y: 590, width: 720, direction: -1 },
  { x: 440, y: 490, width: 720, direction: 1 },
  { x: 520, y: 390, width: 720, direction: -1 },
  { x: 440, y: 290, width: 720, direction: 1 },
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
  salmonInterval: 8300,
  salmonLifetime: 9000,
});

const LEVEL_TWO_PLATFORMS = Object.freeze([
  { x: 480, y: 690, width: 880, direction: -1 },
  { x: 500, y: 590, width: 700, direction: -1 },
  { x: 430, y: 490, width: 690, direction: 1 },
  { x: 520, y: 390, width: 690, direction: -1 },
  { x: 440, y: 290, width: 680, direction: 1 },
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
  { x: 480, y: 690, width: 880, direction: -1 },
  { x: 490, y: 590, width: 720, direction: -1 },
  { x: 455, y: 490, width: 700, direction: 1 },
  { x: 505, y: 390, width: 700, direction: -1 },
  { x: 455, y: 290, width: 680, direction: 1 },
  { x: 500, y: 190, width: 650, direction: -1 },
]);

// The duplicated ladder links are deliberate: Schwein may destroy one of the
// marked routes without ever making the summit unreachable.
const LEVEL_THREE_LADDERS = Object.freeze([
  { id: 'l3-ladder-0a', x: 720, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l3-ladder-0b', x: 340, top: 590, bottom: 690, fromIndex: 0, toIndex: 1 },
  { id: 'l3-ladder-1', x: 210, top: 490, bottom: 590, fromIndex: 1, toIndex: 2 },
  { id: 'l3-ladder-2a', x: 700, top: 390, bottom: 490, fromIndex: 2, toIndex: 3 },
  { id: 'l3-ladder-2b', x: 350, top: 390, bottom: 490, fromIndex: 2, toIndex: 3 },
  { id: 'l3-ladder-3', x: 250, top: 290, bottom: 390, fromIndex: 3, toIndex: 4 },
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
  Object.freeze({ id: 'collapse-l3-p1-right', kind: 'platform-collapse', platformIndex: 1, side: 'right', fraction: 0.34, ladderId: 'l3-ladder-0a', disableEdgeIds: Object.freeze(['l3-ladder-0a']) }),
  Object.freeze({ id: 'collapse-l3-p2-right', kind: 'platform-collapse', platformIndex: 2, side: 'right', fraction: 0.34, ladderId: 'l3-ladder-2a', disableEdgeIds: Object.freeze(['l3-ladder-2a']) }),
  Object.freeze({ id: 'collapse-l3-p4-right', kind: 'platform-collapse', platformIndex: 4, side: 'right', fraction: 0.34, ladderId: 'l3-ladder-4a', disableEdgeIds: Object.freeze(['l3-ladder-4a']) }),
]);

const freezeStage = (stage) => Object.freeze({
  ...stage,
  puddles: Object.freeze(stage.puddles.map((puddle) => Object.freeze(puddle))),
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
    tuning: {
      ballSpeed: TUNING.ballSpeed,
      ballInterval: TUNING.ballInterval,
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
    tuning: {
      ballSpeed: 135,
      ballInterval: 2650,
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
    tuning: {
      ballSpeed: 142,
      ballInterval: 2500,
      salmonInterval: 7400,
    },
  }),
]);

export const getStage = (level) => STAGES.find((stage) => stage.level === level) || null;
export const hasStage = (level) => getStage(level) !== null;
