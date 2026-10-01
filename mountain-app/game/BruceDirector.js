import { ASSETS } from './AssetManifest.js';
import { bruceSpeedForLevel, isBruceLevel } from './campaign.js';
import { BRUCE_SUMMIT_LINES, GAMEPLAY_NOTICES, pickLine } from './Dialogue.js';
import { WORLD } from './level.js';

function ladderFromIndex(stage, ladder) {
  if (Number.isInteger(ladder.fromIndex)) return ladder.fromIndex;
  return stage.platforms.findIndex((platform) => platform.y === ladder.bottom);
}

function ladderToIndex(stage, ladder) {
  if (Number.isInteger(ladder.toIndex)) return ladder.toIndex;
  return stage.platforms.findIndex((platform) => platform.y === ladder.top);
}

function appendRunAcrossGaps(route, stage, platformIndex, startX, targetX) {
  const y = stage.platforms[platformIndex].y - 12;
  const direction = Math.sign(targetX - startX) || 1;
  const gaps = (stage.gaps || [])
    .filter((gap) => gap.platformIndex === platformIndex && (
      direction > 0 ? gap.gapX > startX && gap.gapX < targetX : gap.gapX < startX && gap.gapX > targetX
    ))
    .sort((a, b) => direction * (a.gapX - b.gapX));

  gaps.forEach((gap) => {
    const clearance = gap.gapWidth / 2 + 18;
    route.push({ x: gap.gapX - direction * clearance, y, mode: 'run', platformIndex });
    route.push({ x: gap.gapX + direction * clearance, y, mode: 'jump', platformIndex });
  });
  route.push({ x: targetX, y, mode: 'run', platformIndex });
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
    appendRunAcrossGaps(route, stage, row, currentX, ladder.x);
    route.push({ x: ladder.x, y: stage.platforms[row + 1].y - 12, mode: 'climb', platformIndex: row + 1 });
    currentX = ladder.x;
  }

  appendRunAcrossGaps(
    route,
    stage,
    stage.platforms.length - 1,
    currentX,
    stage.summit.x - 42,
  );
  return route;
}

export function buildBruceDescentRoute(stage) {
  const topIndex = stage.platforms.length - 1;
  const top = stage.platforms[topIndex];
  const route = [{ x: stage.summit.x + 42, y: top.y - 12, mode: 'run', platformIndex: topIndex }];
  let currentX = route[0].x;

  for (let row = topIndex; row > 0; row -= 1) {
    const ladders = stage.ladders.filter((ladder) => ladderToIndex(stage, ladder) === row);
    if (!ladders.length) throw new Error(`Bruce descent has no ladder from platform ${row}`);
    const ladder = ladders.reduce((best, candidate) => (
      Math.abs(candidate.x - currentX) < Math.abs(best.x - currentX) ? candidate : best
    ));
    appendRunAcrossGaps(route, stage, row, currentX, ladder.x);
    route.push({ x: ladder.x, y: stage.platforms[row - 1].y - 12, mode: 'climb', platformIndex: row - 1 });
    currentX = ladder.x;
  }

  appendRunAcrossGaps(route, stage, 0, currentX, -70);
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
    this.jumpState = null;
    this.reachedSummit = false;
  }

  reset(now) {
    this.clear();
    this.reachedSummit = false;
    this.runIndex = 0;
    this.runPlans = this.scene.stage.bruceRuns?.length
      ? this.scene.stage.bruceRuns
      : [{ direction: 'up', delay: 5200 }];
    this.scheduled = isBruceLevel(this.scene.state.level) && this.runPlans.length > 0;
    this.nextStartAt = this.scheduled ? now + (this.runPlans[0].delay ?? 5200) : Number.POSITIVE_INFINITY;
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
      this.finishRun();
      return;
    }
    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const distance = Math.hypot(dx, dy);
    const baseSpeed = bruceSpeedForLevel(this.scene.state.level) || 165;
    if (target.mode === 'jump') {
      this.updateJump(now, target, baseSpeed);
      return;
    }
    this.jumpState = null;
    this.sprite.setAngle(0);
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

  updateJump(now, target, baseSpeed) {
    if (!this.jumpState || this.jumpState.waypointIndex !== this.waypointIndex) {
      const distance = Math.abs(target.x - this.sprite.x);
      this.jumpState = {
        waypointIndex: this.waypointIndex,
        startX: this.sprite.x,
        baseY: target.y,
        startedAt: now,
        duration: Phaser.Math.Clamp(distance / baseSpeed * 700, 360, 560),
      };
      this.sprite.play('bruce-run', true);
    }
    const jump = this.jumpState;
    const progress = Phaser.Math.Clamp((now - jump.startedAt) / jump.duration, 0, 1);
    this.sprite.setPosition(
      Phaser.Math.Linear(jump.startX, target.x, progress),
      jump.baseY - Math.sin(progress * Math.PI) * 44,
    ).setVelocity(0, 0).setAngle(Math.sin(progress * Math.PI * 2) * 7);
    if (progress < 1) return;
    this.sprite.setPosition(target.x, target.y).setAngle(0);
    this.waypointIndex += 1;
    this.jumpState = null;
    this.lastPuddleX = Number.NaN;
  }

  startRun() {
    this.scheduled = false;
    this.running = true;
    this.activeRun = this.runPlans[this.runIndex] || { direction: 'up' };
    this.route = this.activeRun.direction === 'down'
      ? buildBruceDescentRoute(this.scene.stage)
      : buildBruceRoute(this.scene.stage);
    this.waypointIndex = 1;
    this.lastPuddleAt = 0;
    this.lastPuddleX = Number.NaN;
    this.jumpState = null;
    const start = this.route[0];
    this.sprite.enableBody(true, start.x, start.y, true, true)
      .setDisplaySize(88, 88)
      .setAlpha(1)
      .setFlipX(true)
      .play('bruce-run', true);
    this.scene.events.emit('notice', GAMEPLAY_NOTICES.bruceEntry);
  }

  maybeLeavePuddle(now, platformIndex) {
    const platform = this.scene.stage.platforms[platformIndex];
    if (!platform || this.sprite.x < platform.x - platform.width / 2 + 35 || this.sprite.x > platform.x + platform.width / 2 - 35) return;
    if (now - this.lastPuddleAt < 850 || Number.isFinite(this.lastPuddleX) && Math.abs(this.sprite.x - this.lastPuddleX) < 175) return;
    const puddle = this.scene.puddles.create(this.sprite.x, platform.y - 14, 'puddle')
      .setDisplaySize(58, 17)
      .setDepth(7)
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

  finishRun() {
    if (!this.running) return;
    this.running = false;
    const direction = this.activeRun?.direction || 'up';
    if (direction === 'up') this.reachedSummit = true;
    this.sprite.setVelocity(0, 0).play('bruce-run', true);
    if (direction === 'up') this.scene.say(pickLine(BRUCE_SUMMIT_LINES));
    this.scene.time.delayedCall(direction === 'up' ? 1550 : 250, () => {
      if (!this.sprite.active || !this.scene.state.isPlaying()) return;
      this.sprite.setFlipX(direction === 'down').play('bruce-run', true);
      this.scene.tweens.add({
        targets: this.sprite,
        x: direction === 'up' ? WORLD.width + 120 : -120,
        duration: 900,
        ease: 'Linear',
        onComplete: () => {
          this.sprite.disableBody(true, true);
          this.runIndex += 1;
          const next = this.runPlans[this.runIndex];
          if (!next || !this.scene.state.isPlaying()) return;
          this.scheduled = true;
          this.nextStartAt = this.scene.time.now + (next.delay ?? 3200);
        },
      });
    });
  }
}
