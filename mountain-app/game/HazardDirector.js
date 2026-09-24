import { ASSETS } from './AssetManifest.js';
import { TUNING, WORLD } from './level.js';

export function ballDropTargetX(stage, currentPlatformIndex, direction, preferredX = null, radius = TUNING.ballDiameter / 2) {
  const nextPlatform = stage?.platforms?.[currentPlatformIndex - 1];
  if (!nextPlatform) return null;
  const padding = radius + 8;
  const minimum = nextPlatform.x - nextPlatform.width / 2 + padding;
  const maximum = nextPlatform.x + nextPlatform.width / 2 - padding;
  const currentPlatform = stage.platforms[currentPlatformIndex];
  const exitX = direction < 0
    ? currentPlatform.x - currentPlatform.width / 2
    : currentPlatform.x + currentPlatform.width / 2;
  return Math.max(minimum, Math.min(maximum, preferredX ?? exitX));
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
      this.routeBallDrop(ball);
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
      const ball = this.balls.create(665, 95, ASSETS.ballFrames[0].key);
      ball.setDisplaySize(TUNING.ballDiameter, TUNING.ballDiameter).setCircle(112, 16, 16).setBounce(0.05).setDepth(8)
        .setVelocity(-this.tuning('ballSpeed'), -35);
      ball.playReverse('soccer-roll');
      ball.body.setMaxVelocity(180, 520);
      ball.platformIndex = -1;
      ball.dropTargetIndex = null;
      ball.branchPlatformIndex = this.scene.ballDropGap?.branchPlatformIndex ?? null;
    });
    this.scene.events.emit('schwein-line');
  }

  spawnSalmon() {
    this.scene.animateSchwein('salmon');
    this.scene.time.delayedCall(430, () => {
      if (!this.scene.state.isPlaying()) return;
      const start = { x: 780, y: 92 };
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
    this.scene.events.emit('schwein-line', 'FRESH CATCH!');
  }

  platformIndexForPlayer() {
    const feetY = this.scene.player.y + 35;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    this.scene.stage.platforms.forEach((platform, index) => {
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
    if (ball.dropTargetIndex !== null && index !== ball.dropTargetIndex) return;
    if (ball.platformIndex === index) return;
    ball.platformIndex = index;
    ball.dropTargetIndex = null;
    ball.dropTargetX = null;
    const direction = index === ball.branchPlatformIndex
      ? (Phaser.Math.Between(0, 1) ? 1 : -1)
      : this.scene.stage.platforms[index].direction;
    ball.travelDirection = direction;
    ball.setVelocityX(direction * this.tuning('ballSpeed'));
    if (direction < 0) ball.playReverse('soccer-roll', true);
    else ball.play('soccer-roll', true);
  }

  routeBallDrop(ball) {
    if (ball.dropTargetIndex !== null) {
      if (ball.y <= ball.dropStartY + 6) {
        ball.setVelocityX(ball.dropExitDirection * this.tuning('ballSpeed'));
        return;
      }
      const difference = ball.dropTargetX - ball.x;
      ball.setVelocityX(Phaser.Math.Clamp(difference * 5, -this.tuning('ballSpeed'), this.tuning('ballSpeed')));
      return;
    }
    if (!Number.isInteger(ball.platformIndex) || ball.platformIndex <= 0) return;
    const platform = this.scene.stage.platforms[ball.platformIndex];
    const direction = ball.travelDirection ?? platform.direction;
    const radius = TUNING.ballDiameter / 2;
    const gap = this.scene.ballDropGap;
    if (gap && ball.platformIndex === gap.platformIndex) {
      const gapEdge = direction < 0 ? gap.gapX + gap.gapWidth / 2 : gap.gapX - gap.gapWidth / 2;
      const reachedGap = direction < 0 ? ball.x <= gapEdge + radius : ball.x >= gapEdge - radius;
      if (reachedGap) this.beginBallDrop(ball, direction, gap.gapX);
      return;
    }
    const edge = direction < 0
      ? platform.x - platform.width / 2 + radius
      : platform.x + platform.width / 2 - radius;
    const reachedEdge = direction < 0 ? ball.x <= edge : ball.x >= edge;
    if (reachedEdge) this.beginBallDrop(ball, direction);
  }

  beginBallDrop(ball, direction, preferredX = null) {
    const targetIndex = ball.platformIndex - 1;
    const targetX = ballDropTargetX(this.scene.stage, ball.platformIndex, direction, preferredX);
    if (targetX === null) return;
    ball.platformIndex = -1;
    ball.dropTargetIndex = targetIndex;
    ball.dropTargetX = targetX;
    ball.dropStartY = ball.y;
    ball.dropExitDirection = direction;
    ball.setVelocityX(direction * this.tuning('ballSpeed'));
  }

  salmonLanded(fish) {
    if (fish.landed) return;
    fish.landed = true;
    fish.setAngularVelocity(0).setAngle(0).setVelocity(0, 0);
    fish.body.setAllowGravity(false);
  }
}
