export const WORLD = Object.freeze({ width: 960, height: 720 });

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
