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
        return;
      }
      ball.angle += ball.body.velocity.x * 0.018;
    });
    this.salmon.children.each((fish) => {
      if (!fish?.active || !fish.body) return;
      if (now >= fish.expiresAt || fish.y > WORLD.height + 50) fish.destroy();
    });
  }

  spawnBall() {
    const ball = this.balls.create(675, 90, 'soccer-ball');
    ball.setDisplaySize(28, 28).setCircle(24, 4, 4).setBounce(0.05).setDepth(8).setVelocity(-TUNING.ballSpeed, -35);
    ball.body.setMaxVelocity(180, 520);
    ball.platformIndex = -1;
    this.scene.events.emit('schwein-line');
  }

  spawnSalmon() {
    const fish = this.salmon.create(790, 95, 'salmon');
    fish.setDisplaySize(58, 29).setDepth(10).setVelocity(Phaser.Math.Between(-240, -190), -190).setAngularVelocity(-170);
    fish.expiresAt = this.scene.time.now + TUNING.salmonLifetime;
    fish.landed = false;
    this.scene.events.emit('schwein-line', 'FRESH CATCH!');
  }

  ballLanded(ball, platform) {
    const index = platform.getData('platformIndex');
    if (!Number.isInteger(index)) return;
    ball.platformIndex = index;
    ball.setVelocityX(PLATFORMS[index].direction * TUNING.ballSpeed);
  }

  salmonLanded(fish) {
    if (fish.landed) return;
    fish.landed = true;
    fish.setAngularVelocity(0).setAngle(0).setVelocity(0, 0);
    fish.body.setAllowGravity(false);
  }
}
