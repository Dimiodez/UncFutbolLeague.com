import { CAMPAIGN, isBruceLevel } from './campaign.js';

export const HIT_INVULNERABILITY_MS = 3200;

export class GameState {
  constructor() { this.reset(); }

  reset() {
    this.phase = 'intro';
    this.level = 1;
    this.totalLevels = CAMPAIGN.totalLevels;
    this.lives = 3;
    this.altitude = 0;
    this.stunnedUntil = 0;
    this.invulnerableUntil = 0;
    this.yellowCards = 0;
    this.cardedLevels = [];
    this.bruceBonusLevels = [];
  }

  start() {
    this.startLevel(1, { resetLives: true });
  }

  startLevel(level, { resetLives = false } = {}) {
    this.phase = 'playing';
    this.level = level;
    if (resetLives) this.lives = 3;
    this.altitude = 0;
    this.stunnedUntil = 0;
    this.invulnerableUntil = 0;
  }

  issueYellowCard() {
    if (!CAMPAIGN.yellowCardLevels.includes(this.level) || this.cardedLevels.includes(this.level)) return false;
    this.cardedLevels.push(this.level);
    this.yellowCards += 1;
    return true;
  }

  summitOutcome() {
    if (this.yellowCards >= 2) return 'red-card';
    if (this.cardedLevels.includes(this.level)) return 'yellow-card';
    return 'escaped';
  }

  awardBruceBonus(bruceReachedSummit) {
    if (this.level !== 5 || !isBruceLevel(this.level) || bruceReachedSummit || this.bruceBonusLevels.includes(this.level)) return 0;
    this.bruceBonusLevels.push(this.level);
    this.lives += 2;
    return 2;
  }

  isPlaying() { return this.phase === 'playing'; }
  isStunned(now) { return now < this.stunnedUntil; }
  isInvulnerable(now) { return now < this.invulnerableUntil; }
  stun(now, duration) { this.stunnedUntil = Math.max(this.stunnedUntil, now + duration); }

  takeHit(now) {
    if (!this.isPlaying() || this.isInvulnerable(now)) return false;
    this.lives -= 1;
    this.invulnerableUntil = now + HIT_INVULNERABILITY_MS;
    this.phase = this.lives > 0 ? 'hit' : 'over';
    return true;
  }
}
