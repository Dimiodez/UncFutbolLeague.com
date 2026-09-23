export const ASSETS = Object.freeze({
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
});
