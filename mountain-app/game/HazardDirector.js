import { ASSETS } from './AssetManifest.js';
import { TUNING, WORLD } from './level.js';

export const chooseBallDeflection = (random = Math.random) => (random() < 0.5 ? -1 : 1);

export const isInsideRespawnClearance = (ballX, ballY, spawn, radius) => (
  Math.hypot(ballX - spawn.x, ballY - spawn.y) <= radius
);

export function projectedBallLandingX(stage, currentPlatformIndex, direction, speed, gravity, startX = null) {
  const current = stage?.platforms?.[currentPlatformIndex];
  const next = stage?.platforms?.[currentPlatformIndex - 1];
  if (!current || !next) return null;
  const dropHeight = next.y - current.y;
  const fallSeconds = Math.sqrt((2 * dropHeight) / gravity);
  const edgeX = direction < 0
    ? current.x - current.width / 2 - TUNING.ballDiameter / 2
    : current.x + current.width / 2 + TUNING.ballDiameter / 2;
  return (startX ?? edgeX) + direction * speed * fallSeconds;
}

export class HazardDirector {
  constructor(scene) {
    this.scene = scene;
    this.balls = scene.physics.add.group({ allowGravity: true });
    this.salmon = scene.physics.add.group({ allowGravity: true });
    this.nextBallAt = 0;
    this.nextSalmonAt = 0;
  }

  reset(now) {
    this.balls.clear(true, true);
    this.salmon.clear(true, true);
    this.nextBallAt = now + this.tuning('initialBallDelay');
    this.nextSalmonAt = now + 4800;
  }

  clear() {
    this.balls.clear(true, true);
    this.salmon.clear(true, true);
  }

  clearBallsNear(spawn, radius = 220) {
    this.balls.children.each((ball) => {
      if (ball?.active && isInsideRespawnClearance(ball.x, ball.y, spawn, radius)) ball.destroy();
    });
  }

  tuning(key) {
    return this.scene.stage?.tuning?.[key] ?? TUNING[key];
  }

  update(now) {
    if (now >= this.nextBallAt) {
      this.spawnBall();
      this.nextBallAt = now + this.tuning('ballInterval') + Phaser.Math.Between(-350, 500);
    }
    if (now >= this.nextSalmonAt) {
      this.spawnSalmon();
      this.nextSalmonAt = now + this.tuning('salmonInterval') + Phaser.Math.Between(-900, 1600);
    }
    this.balls.children.each((ball) => {
      if (!ball?.active || !ball.body) return;
      if (ball.y > WORLD.height + 40) {
        ball.destroy();
      }
    });
    this.salmon.children.each((fish) => {
      if (!fish?.active || !fish.body) return;
      if (now >= fish.expiresAt || fish.y > WORLD.height + 50) fish.destroy();
    });
  }

  spawnBall() {
    const schwein = this.scene.stage.schwein;
    const direction = schwein?.randomThrowDirection
      ? chooseBallDeflection()
      : schwein?.throwDirection ?? -1;
    if (schwein?.randomThrowDirection) this.scene.schwein.setFlipX(direction > 0);
    this.scene.animateSchwein();
    this.scene.time.delayedCall(430, () => {
      if (!this.scene.state.isPlaying()) return;
      const maxBalls = this.tuning('maxBalls');
      if (Number.isFinite(maxBalls)) {
        const activeBalls = this.balls.getChildren()
          .filter((ball) => ball?.active)
          .sort((a, b) => (a.getData('spawnedAt') || 0) - (b.getData('spawnedAt') || 0));
        while (activeBalls.length >= maxBalls) activeBalls.shift().destroy();
      }
      const spawnX = (schwein?.ballSpawnX ?? 665)
        + direction * (schwein?.randomThrowDirection ? schwein?.ballSpawnOffset ?? 0 : 0);
      const ball = this.balls.create(spawnX, 95, ASSETS.ballFrames[0].key);
      ball.setDisplaySize(TUNING.ballDiameter, TUNING.ballDiameter).setCircle(112, 16, 16).setBounce(0.05).setDepth(8)
        .setVelocity(direction * this.tuning('ballSpeed'), -35);
      if (direction < 0) ball.playReverse('soccer-roll');
      else ball.play('soccer-roll');
      ball.body.setMaxVelocity(Math.max(220, this.tuning('ballSpeed') * 1.25), 520);
      ball.setData('spawnedAt', this.scene.time.now);
      ball.platformIndex = -1;
    });
    this.scene.events.emit('schwein-ball-line');
  }

  spawnSalmon() {
    this.scene.animateSchwein('salmon');
    this.scene.time.delayedCall(430, () => {
      if (!this.scene.state.isPlaying()) return;
      const start = { x: this.scene.stage.schwein?.salmonSpawnX ?? 780, y: 92 };
      const targetIndex = this.platformIndexForPlayer();
      const targetPlatform = this.scene.stage.platforms[targetIndex];
      const halfWidth = targetPlatform.width / 2 - 34;
      const targetX = Phaser.Math.Clamp(
        this.scene.player.x + Phaser.Math.Between(-45, 45),
        targetPlatform.x - halfWidth,
        targetPlatform.x + halfWidth,
      );
      const targetY = targetPlatform.y - 18;
      const flightSeconds = 1.25;
      const gravity = this.scene.physics.world.gravity.y;
      const velocityX = (targetX - start.x) / flightSeconds;
      const velocityY = (targetY - start.y - 0.5 * gravity * flightSeconds ** 2) / flightSeconds;
      const fish = this.salmon.create(start.x, start.y, 'salmon');
      fish.setDisplaySize(58, 29).setDepth(10)
        .setVelocity(velocityX, velocityY).setAngularVelocity(velocityX < 0 ? -240 : 240);
      fish.expiresAt = this.scene.time.now + TUNING.salmonLifetime;
      fish.landed = false;
      fish.targetPlatformIndex = targetIndex;
    });
    this.scene.events.emit('schwein-salmon-line');
  }

  platformIndexForPlayer() {
    const feetY = this.scene.player.y + 35;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    this.scene.stage.platforms.forEach((platform, index) => {
      const halfWidth = platform.width / 2;
      const horizontalMiss = Math.max(0, Math.abs(this.scene.player.x - platform.x) - halfWidth);
      const distance = Math.abs(platform.y - feetY) + horizontalMiss * 3;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  shouldSalmonLand(fish, platform) {
    return fish.targetPlatformIndex === platform.getData('platformIndex') && fish.body.velocity.y > 0;
  }

  ballLanded(ball, platform) {
    const index = platform.getData('platformIndex');
    if (!Number.isInteger(index)) return;
    if (ball.platformIndex === index) return;
    ball.platformIndex = index;
    const direction = Math.sign(ball.body.velocity.x) || this.scene.stage.platforms[index].direction;
    ball.setVelocityX(direction * this.tuning('ballSpeed'));
    if (direction < 0) ball.playReverse('soccer-roll', true);
    else ball.play('soccer-roll', true);
  }

  ballHitBumper(ball, bumper) {
    const randomDirection = bumper.getData('randomDirection');
    const reflectIncoming = bumper.getData('reflectIncoming');
    let direction = bumper.getData('direction');
    const now = this.scene.time.now;
    if (now < (ball.getData('bumperLockUntil') || 0)) return;
    if (reflectIncoming) direction = -(Math.sign(ball.body.velocity.x) || direction || 1);
    if (randomDirection) {
      if (now < (ball.getData('deflectLockUntil') || 0)) return;
      direction = chooseBallDeflection();
      // Clear the illustrated tip before handing the ball back to gravity. The
      // collider is intentionally shorter than the art so a shallow release
      // could otherwise look like the ball was clipping through the peak.
      const clearance = bumper.body.width / 2 + ball.body.width / 2 + 10;
      ball.setData('deflectLockUntil', now + 650)
        .setPosition(bumper.x + direction * clearance, Math.min(ball.y, bumper.y - 39))
        .setVelocityY(30);
    }
    if (!direction) return;
    const clearance = bumper.body.width / 2 + ball.body.width / 2 + 4;
    ball.setData('bumperLockUntil', now + 300)
      .setX(bumper.x + direction * clearance)
      .setVelocityX(direction * this.tuning('ballSpeed'));
    if (direction < 0) ball.playReverse('soccer-roll', true);
    else ball.play('soccer-roll', true);
  }

  salmonLanded(fish) {
    if (fish.landed) return;
    fish.landed = true;
    fish.setAngularVelocity(0).setAngle(0).setVelocity(0, 0);
    fish.body.setAllowGravity(false);
  }
}
