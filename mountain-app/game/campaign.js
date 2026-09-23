export const CAMPAIGN = Object.freeze({
  totalLevels: 10,
  tantrumEvery: 3,
});

export function isTantrumLevel(level) {
  return level > 1 && level < CAMPAIGN.totalLevels && level % CAMPAIGN.tantrumEvery === 0;
}
