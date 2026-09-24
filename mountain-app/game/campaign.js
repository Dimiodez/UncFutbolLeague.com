export const CAMPAIGN = Object.freeze({
  totalLevels: 10,
  tantrumEvery: 3,
  bruceEvery: 5,
});

// Authored ahead of the later stages so the movement contract stays explicit:
// ice preserves jumping, but commits the player to their entry direction.
export const ICE_STAGE_RULES = Object.freeze({
  7: Object.freeze({ coverage: 'partial', jumpAllowed: true, steeringLocked: true }),
  9: Object.freeze({ coverage: 'full-platform', fullPlatformCount: 1, jumpAllowed: true, steeringLocked: true }),
});

export function iceRuleForLevel(level) {
  return ICE_STAGE_RULES[level] || null;
}

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
