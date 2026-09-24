import { ASSETS } from './AssetManifest.js';
import { bruceSpeedForLevel, isBruceLevel } from './campaign.js';
import { WORLD } from './level.js';

const BRUCE_LINES = [
  'WAIT... WHERE AM I? HOW DID I GET HERE?',
  "THIS ISN'T THE KITCHEN... WHERE DID MY SANDWICH GO?",
  'WHO MOVED THE LAUNDRY ROOM?',
];

function ladderFromIndex(stage, ladder) {
  if (Number.isInteger(ladder.fromIndex)) return ladder.fromIndex;
  return stage.platforms.findIndex((platform) => platform.y === ladder.bottom);
}

export function buildBruceRoute(stage, worldWidth = WORLD.width) {
  const bottom = stage.platforms[0];
  const route = [{ x: worldWidth + 70, y: bottom.y - 12, mode: 'run', platformIndex: 0 }];
  let currentX = route[0].x;

  for (let row = 0; row < stage.platforms.length - 1; row += 1) {
    const ladders = stage.ladders.filter((ladder) => ladderFromIndex(stage, ladder) === row);
    if (!ladders.length) throw new Error(`Bruce route has no ladder from platform ${row}`);
    const ladder = ladders.reduce((best, candidate) => (
      Math.abs(candidate.x - currentX) < Math.abs(best.x - currentX) ? candidate : best
    ));
    route.push({ x: ladder.x, y: stage.platforms[row].y - 12, mode: 'run', platformIndex: row });
    route.push({ x: ladder.x, y: stage.platforms[row + 1].y - 12, mode: 'climb', platformIndex: row + 1 });
    currentX = ladder.x;
  }

  route.push({ x: stage.summit.x - 42, y: stage.platforms.at(-1).y - 12, mode: 'run', platformIndex: stage.platforms.length - 1 });
  return route;
}

export class BruceDirector {
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(-200, -200, ASSETS.bruceRunFrames[0].key)
      .setOrigin(0.5, 1)
      .setDisplaySize(88, 88)
      .setDepth(11)
      .setVisible(false);
    this.sprite.body.setAllowGravity(false).setSize(82, 50).setOffset(39, 108);
    this.sprite.disableBody(true, true);
    this.running = false;
    this.scheduled = false;
    this.nextStartAt = Number.POSITIVE_INFINITY;
    this.lastPuddleAt = 0;
    this.lastPuddleX = Number.NaN;
  }

  reset(now) {
    this.clear();
    this.scheduled = isBruceLevel(this.scene.state.level);
    this.nextStartAt = this.scheduled ? now + 5200 : Number.POSITIVE_INFINITY;
  }

  clear() {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setVelocity(0, 0).disableBody(true, true);
    this.running = false;
    this.scheduled = false;
    this.scene.puddles?.children.each((puddle) => {
      if (puddle?.active && puddle.getData('bruceDynamic')) puddle.destroy();
    });
  }

  update(now, delta) {
    this.expirePuddles(now);
    if (this.scheduled && now >= this.nextStartAt) this.startRun();
    if (!this.running || !this.scene.state.isPlaying()) return;

    const target = this.route[this.waypointIndex];
    if (!target) {
      this.arriveAtSummit();
      return;
    }
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const distance = Math.hypot(dx, dy);
    const baseSpeed = bruceSpeedForLevel(this.scene.state.level) || 165;
    const speed = target.mode === 'climb' ? baseSpeed * 0.82 : baseSpeed;
    const step = speed * delta / 1000;

    if (distance <= step + 2) {
      this.sprite.setPosition(target.x, target.y).setVelocity(0, 0);
      this.waypointIndex += 1;
      this.lastPuddleX = Number.NaN;
      return;
    }

    this.sprite.setVelocity(dx / distance * speed, dy / distance * speed);
    if (target.mode === 'climb') {
      this.sprite.setFlipX(false).play('bruce-climb', true);
    } else {
      this.sprite.setFlipX(dx < 0).play('bruce-run', true);
      this.maybeLeavePuddle(now, target.platformIndex);
    }
  }

  startRun() {
    this.scheduled = false;
    this.running = true;
    this.route = buildBruceRoute(this.scene.stage);
    this.waypointIndex = 1;
    this.lastPuddleAt = 0;
    this.lastPuddleX = Number.NaN;
    const start = this.route[0];
    this.sprite.enableBody(true, start.x, start.y, true, true)
      .setDisplaySize(88, 88)
      .setAlpha(1)
      .setFlipX(true)
      .play('bruce-run', true);
    this.scene.events.emit('notice', 'BRUCE IS LOOSE!');
  }

  maybeLeavePuddle(now, platformIndex) {
    const platform = this.scene.stage.platforms[platformIndex];
    if (!platform || this.sprite.x < platform.x - platform.width / 2 + 35 || this.sprite.x > platform.x + platform.width / 2 - 35) return;
    if (now - this.lastPuddleAt < 850 || Number.isFinite(this.lastPuddleX) && Math.abs(this.sprite.x - this.lastPuddleX) < 175) return;
    const puddle = this.scene.puddles.create(this.sprite.x, platform.y - 14, 'puddle')
      .setDisplaySize(42, 12)
      .setDepth(6)
      .setData('bruceDynamic', true)
      .setData('expiresAt', now + 8500)
      .setData('safeUntil', now + 300);
    puddle.refreshBody();
    this.lastPuddleAt = now;
    this.lastPuddleX = this.sprite.x;
  }

  expirePuddles(now) {
    this.scene.puddles?.children.each((puddle) => {
      if (puddle?.active && puddle.getData('bruceDynamic') && now >= puddle.getData('expiresAt')) puddle.destroy();
    });
  }

  arriveAtSummit() {
    if (!this.running) return;
    this.running = false;
    this.sprite.setVelocity(0, 0).play('bruce-run', true);
    this.scene.say(Phaser.Utils.Array.GetRandom(BRUCE_LINES));
    this.scene.time.delayedCall(1550, () => {
      if (!this.sprite.active || !this.scene.state.isPlaying()) return;
      this.sprite.setFlipX(false).play('bruce-run', true);
      this.scene.tweens.add({
        targets: this.sprite,
        x: WORLD.width + 120,
        duration: 900,
        ease: 'Linear',
        onComplete: () => this.sprite.disableBody(true, true),
      });
    });
  }
}
