import { PLATFORMS, TUNING, WORLD } from './level.js';

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
    this.nextBallAt = now + 900;
    this.nextSalmonAt = now + 4800;
  }

  update(now) {
    if (now >= this.nextBallAt) {
      this.spawnBall();
      this.nextBallAt = now + TUNING.ballInterval + Phaser.Math.Between(-350, 500);
    }
    if (now >= this.nextSalmonAt) {
      this.spawnSalmon();
      this.nextSalmonAt = now + TUNING.salmonInterval + Phaser.Math.Between(-900, 1600);
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
    this.scene.animateSchwein();
    this.scene.time.delayedCall(430, () => {
      if (!this.scene.state.isPlaying()) return;
      const ball = this.balls.create(665, 95, 'soccer-ball');
      ball.setDisplaySize(TUNING.ballDiameter, TUNING.ballDiameter).setCircle(24, 4, 4).setBounce(0.05).setDepth(8)
        .setVelocity(-TUNING.ballSpeed, -35).setAngularVelocity(-430);
      ball.body.setMaxVelocity(180, 520);
      ball.platformIndex = -1;
    });
    this.scene.events.emit('schwein-line');
  }

  spawnSalmon() {
    this.scene.animateSchwein('salmon');
    this.scene.time.delayedCall(430, () => {
      if (!this.scene.state.isPlaying()) return;
      const start = { x: 780, y: 92 };
      const targetIndex = this.platformIndexForPlayer();
      const targetPlatform = PLATFORMS[targetIndex];
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
    this.scene.events.emit('schwein-line', 'FRESH CATCH!');
  }

  platformIndexForPlayer() {
    const feetY = this.scene.player.y + 35;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    PLATFORMS.forEach((platform, index) => {
      const distance = Math.abs(platform.y - feetY);
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
    ball.platformIndex = index;
    const direction = PLATFORMS[index].direction;
    ball.setVelocityX(direction * TUNING.ballSpeed).setAngularVelocity(direction * 430);
  }

  salmonLanded(fish) {
    if (fish.landed) return;
    fish.landed = true;
    fish.setAngularVelocity(0).setAngle(0).setVelocity(0, 0);
    fish.body.setAllowGravity(false);
  }
}
