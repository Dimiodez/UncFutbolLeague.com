export const CAMPAIGN = Object.freeze({
  totalLevels: 10,
  tantrumEvery: 3,
  bruceEvery: 5,
});

export function isTantrumLevel(level) {
  return level > 1 && level < CAMPAIGN.totalLevels && level % CAMPAIGN.tantrumEvery === 0;
}

export function isBruceLevel(level) {
  return level > 0 && level % CAMPAIGN.bruceEvery === 0;
}

export function bruceSpeedForLevel(level) {
  if (!isBruceLevel(level)) return 0;
  return level >= 10 ? 215 : 165;
}
