export class GameState {
  constructor() { this.reset(); }

  reset() {
    this.phase = 'intro';
    this.level = 1;
    this.totalLevels = 10;
    this.lives = 3;
    this.altitude = 0;
    this.stunnedUntil = 0;
    this.invulnerableUntil = 0;
  }

  start() {
    this.phase = 'playing';
    this.lives = 3;
    this.altitude = 0;
    this.stunnedUntil = 0;
    this.invulnerableUntil = 0;
  }

  summitOutcome() { return this.level >= this.totalLevels ? 'red-card' : 'escaped'; }

  isPlaying() { return this.phase === 'playing'; }
  isStunned(now) { return now < this.stunnedUntil; }
  stun(now, duration) { this.stunnedUntil = Math.max(this.stunnedUntil, now + duration); }

  takeHit(now) {
    if (!this.isPlaying() || now < this.invulnerableUntil) return false;
    this.lives -= 1;
    this.invulnerableUntil = now + 1500;
    this.phase = this.lives > 0 ? 'hit' : 'over';
    return true;
  }
}
