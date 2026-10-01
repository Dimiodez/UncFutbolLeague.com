import { CAMPAIGN } from './campaign.js';

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
    this.resetRunStats();
  }

  start() {
    this.startLevel(1, { resetRun: true });
  }

  resetRunStats() {
    this.stats = {
      activePlayMs: 0,
      totalDeaths: 0,
      ballsTakenToFace: 0,
      salmonStrikes: 0,
      bruceSockKnocks: 0,
      bizzieInterruptions: 0,
    };
  }

  startLevel(level, { resetRun = false } = {}) {
    if (resetRun) {
      this.resetRunStats();
      this.yellowCards = 0;
      this.cardedLevels = [];
    }
    this.phase = 'playing';
    this.level = level;
    this.lives = 3;
    this.altitude = 0;
    this.stunnedUntil = 0;
    this.invulnerableUntil = 0;
  }

  tick(delta) {
    if (!this.isPlaying() || !Number.isFinite(delta) || delta <= 0) return;
    this.stats.activePlayMs += delta;
  }

  recordDeath(source) {
    this.stats.totalDeaths += 1;
    if (source === 'ball') this.stats.ballsTakenToFace += 1;
  }

  recordSalmonStrike() { this.stats.salmonStrikes += 1; }
  recordBruceSockKnock() { this.stats.bruceSockKnocks += 1; }
  recordBizzieInterruption() { this.stats.bizzieInterruptions += 1; }

  runSummary() {
    return Object.freeze({ ...this.stats, activePlayMs: Math.round(this.stats.activePlayMs) });
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

  isPlaying() { return this.phase === 'playing'; }
  isStunned(now) { return now < this.stunnedUntil; }
  isInvulnerable(now) { return now < this.invulnerableUntil; }
  stun(now, duration) { this.stunnedUntil = Math.max(this.stunnedUntil, now + duration); }

  takeHit(now, source = 'unknown') {
    if (!this.isPlaying() || this.isInvulnerable(now)) return false;
    this.recordDeath(source);
    this.lives -= 1;
    this.invulnerableUntil = now + HIT_INVULNERABILITY_MS;
    this.phase = this.lives > 0 ? 'hit' : 'over';
    return true;
  }
}
