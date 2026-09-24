export const ASSETS = Object.freeze({
  background: Object.freeze({ key: 'mountain-backdrop-v2', url: 'assets/environment/mountain-backdrop-v2.png' }),
  climber: Object.freeze({ key: 'climber', url: 'assets/characters/climber.png' }),
  schwein: Object.freeze({ key: 'schwein-summit', url: 'assets/characters/schwein-summit.png' }),
  salmon: Object.freeze({ key: 'salmon', url: 'assets/hazards/salmon.png' }),
  playerFrames: Object.freeze(Array.from({ length: 8 }, (_, index) => Object.freeze({
    key: `climber-frame-${index + 1}`,
    url: `assets/sprites/player/${String(index + 1).padStart(2, '0')}.png`,
  }))),
  schweinFrames: Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({
    key: `schwein-frame-${index + 1}`,
    url: `assets/sprites/schwein/${String(index + 1).padStart(2, '0')}.png`,
  }))),
  schweinSalmonFrames: Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({
    key: `schwein-salmon-frame-${index + 1}`,
    url: `assets/sprites/schwein-salmon/${String(index + 1).padStart(2, '0')}.png`,
  }))),
  schweinRunFrames: Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({
    key: `schwein-run-frame-${index + 1}`,
    url: `assets/sprites/schwein-run/${String(index + 1).padStart(2, '0')}.png`,
  }))),
  schweinTantrumFrames: Object.freeze(Array.from({ length: 5 }, (_, index) => Object.freeze({
    key: `schwein-tantrum-frame-${index + 1}`,
    url: `assets/sprites/schwein-tantrum/${String(index + 1).padStart(2, '0')}.png`,
  }))),
  ballFrames: Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({
    key: `soccer-ball-frame-${index + 1}`,
    url: `assets/sprites/ball/${String(index + 1).padStart(2, '0')}.png`,
  }))),
  bruceRunFrames: Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({
    key: `bruce-run-frame-${index + 1}`,
    url: `assets/sprites/bruce-run/${String(index + 1).padStart(2, '0')}.png`,
  }))),
  bruceClimbFrames: Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({
    key: `bruce-climb-frame-${index + 1}`,
    url: `assets/sprites/bruce-climb/${String(index + 1).padStart(2, '0')}.png`,
  }))),
});
