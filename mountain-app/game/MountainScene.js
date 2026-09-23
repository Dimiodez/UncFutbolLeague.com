import { createTextures } from './ArtFactory.js';
import { GameState } from './GameState.js';
import { HazardDirector } from './HazardDirector.js';
import { InputController } from './InputController.js';
import { LADDERS, PLATFORMS, PLAYER_START, SUMMIT, TUNING, WORLD } from './level.js';

const SPEECH = ['NOT TODAY, UNC!', 'BALL INCOMING!', 'CLIMB FASTER!', 'WELCOME TO THE PIG PEN!', 'THE SUMMIT IS MINE!'];

export class MountainScene extends Phaser.Scene {
  constructor() { super('mountain'); }

  create() {
    createTextures(this);
    this.state = new GameState();
    this.inputController = new InputController(this);
    this.drawMountain();
    this.createCourse();
    this.createActors();
    this.createPhysics();
    this.hazards = new HazardDirector(this);
    this.events.on('schwein-line', (line) => this.say(line || Phaser.Utils.Array.GetRandom(SPEECH)));
    this.events.emit('game-ready', this);
  }

  drawMountain() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x75a8b9, 0x75a8b9, 0xc8ddd1, 0xc8ddd1, 1);
    g.fillRect(0, 0, WORLD.width, WORLD.height);
    g.fillStyle(0xf5eccd, 0.7).fillCircle(100, 80, 35);
    for (let i = 0; i < 7; i += 1) {
      const x = 80 + i * 155;
      g.fillStyle(0xe7eee4, 0.65).fillEllipse(x, 95 + (i % 2) * 25, 130, 28);
    }
    g.fillStyle(0x365968).fillTriangle(20, 720, 470, 40, 920, 720);
    g.fillStyle(0x587783).fillTriangle(260, 720, 655, 105, 960, 720);
    g.fillStyle(0xeaf3ed).fillTriangle(332, 250, 470, 40, 585, 220);
    g.fillStyle(0xb8d2ce).fillTriangle(535, 292, 655, 105, 742, 260);
    g.fillStyle(0x284856).fillTriangle(20, 720, 240, 360, 315, 720);
    for (let y = 250; y < 700; y += 75) {
      g.fillStyle(0x274752, 0.48).fillTriangle(250, y, 300, y - 50, 345, y);
      g.fillTriangle(640, y + 20, 700, y - 35, 750, y + 20);
    }
  }

  createCourse() {
    this.platforms = this.physics.add.staticGroup();
    PLATFORMS.forEach((spec, index) => {
      const platform = this.platforms.create(spec.x, spec.y, 'platform');
      platform.setDisplaySize(spec.width, 24).refreshBody().setDepth(5).setData('platformIndex', index);
      platform.body.checkCollision.down = false;
      platform.body.checkCollision.left = false;
      platform.body.checkCollision.right = false;
    });
    this.ladders = LADDERS.map((ladder) => {
      const top = ladder.top + 8;
      const bottom = ladder.bottom - 8;
      const height = bottom - top;
      const g = this.add.graphics().setDepth(4);
      g.lineStyle(6, 0xb97843).lineBetween(ladder.x - 16, top, ladder.x - 16, bottom).lineBetween(ladder.x + 16, top, ladder.x + 16, bottom);
      g.lineStyle(4, 0xe0aa63);
      for (let y = top + 7; y < bottom; y += 18) g.lineBetween(ladder.x - 16, y, ladder.x + 16, y);
      return { ...ladder, top, bottom, height };
    });
    this.add.rectangle(SUMMIT.x, SUMMIT.y - 23, 5, 58, 0xf7f5df).setDepth(6);
    this.add.triangle(SUMMIT.x + 20, SUMMIT.y - 45, 0, 0, 42, 12, 0, 24, 0xd64d3d).setDepth(6);
    this.add.text(SUMMIT.x - 42, SUMMIT.y + 4, 'SUMMIT', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', backgroundColor: '#15344d', padding: { x: 5, y: 3 } }).setDepth(7);
    this.puddles = this.physics.add.staticGroup();
    [[390, 476], [620, 576]].forEach(([x, y]) => {
      const puddle = this.puddles.create(x, y, 'puddle').setDepth(6);
      puddle.refreshBody();
    });
    this.add.text(345, 449, 'BRUCE WAS HERE', { fontFamily: 'monospace', fontSize: '10px', color: '#9fd8df' }).setDepth(6);
  }

  createActors() {
    this.schwein = this.add.image(755, 132, 'schwein').setDepth(9);
    this.player = this.physics.add.sprite(PLAYER_START.x, PLAYER_START.y, 'player').setDepth(10);
    this.player.body.setSize(21, 37).setOffset(4, 2).setMaxVelocity(220, 520);
    this.player.setCollideWorldBounds(true);
    this.player.climbing = false;
  }

  createPhysics() {
    const allowPlayerPlatform = () => !this.player.climbing;
    this.physics.add.collider(this.player, this.platforms, null, allowPlayerPlatform);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height + 80);
    this.time.delayedCall(0, () => {
      this.physics.add.collider(this.hazards.balls, this.platforms, (ball, platform) => this.hazards.ballLanded(ball, platform));
      this.physics.add.collider(this.hazards.salmon, this.platforms, (fish) => this.hazards.salmonLanded(fish));
      this.physics.add.overlap(this.player, this.hazards.balls, () => this.hitByBall());
      this.physics.add.overlap(this.player, this.hazards.salmon, (_player, fish) => this.slip('SALMON SLIP!', fish));
    });
    this.physics.add.overlap(this.player, this.puddles, () => this.slip('BRUCE SWEAT SLIDE!'));
  }

  startRun() {
    this.state.start();
    this.inputController.clear();
    this.resetPlayer();
    this.hazards.reset(this.time.now);
    this.say('GET OFF MY MOUNTAIN!');
    this.events.emit('state-change');
  }

  resetPlayer() {
    this.player.enableBody(true, PLAYER_START.x, PLAYER_START.y, true, true);
    this.player.setTexture('player').setAngle(0).setAlpha(1).setVelocity(0, 0);
    this.player.body.setAllowGravity(true);
    this.player.climbing = false;
  }

  nearestLadder() {
    return this.ladders.find((ladder) => Math.abs(this.player.x - ladder.x) < 28 && this.player.y > ladder.top - 36 && this.player.y < ladder.bottom + 30);
  }

  update(time) {
    if (!this.state?.isPlaying()) return;
    this.hazards.update(time);
    const altitude = Math.max(0, Math.round((WORLD.height - this.player.y) * 18));
    if (altitude !== this.state.altitude) {
      this.state.altitude = altitude;
      this.events.emit('state-change');
    }
    if (this.state.isStunned(time)) {
      this.player.setVelocityX(0);
      return;
    }
    if (this.player.texture.key === 'player-slip') this.player.setTexture('player').setAngle(0);
    const ladder = this.nearestLadder();
    const vertical = (this.inputController.down('up') ? -1 : 0) + (this.inputController.down('down') ? 1 : 0);
    const horizontal = (this.inputController.down('left') ? -1 : 0) + (this.inputController.down('right') ? 1 : 0);
    if (ladder && vertical !== 0) {
      this.player.climbing = true;
      this.player.x = Phaser.Math.Linear(this.player.x, ladder.x, 0.35);
    }
    if (this.player.climbing) {
      this.player.body.setAllowGravity(false);
      this.player.setVelocity(horizontal * TUNING.moveSpeed * 0.45, vertical * TUNING.climbSpeed);
      if (!ladder || horizontal !== 0 && vertical === 0 || this.player.y < ladder?.top - 18 || this.player.y > ladder?.bottom + 20) this.stopClimbing();
    } else {
      this.player.body.setAllowGravity(true);
      this.player.setVelocityX(horizontal * TUNING.moveSpeed);
      if (this.inputController.consumeJump() && this.player.body.blocked.down) this.player.setVelocityY(-TUNING.jumpSpeed);
    }
    this.player.setFlipX(horizontal < 0);
    if (this.player.x > SUMMIT.x - 32 && this.player.y < 180) this.win();
  }

  stopClimbing() {
    this.player.climbing = false;
    this.player.body.setAllowGravity(true);
  }

  slip(label, hazard) {
    if (!this.state.isPlaying() || this.state.isStunned(this.time.now)) return;
    this.state.stun(this.time.now, TUNING.stunMs);
    this.stopClimbing();
    this.player.setTexture('player-slip').setVelocity(0, 0);
    if (hazard?.active) hazard.destroy();
    this.cameras.main.shake(120, 0.006);
    this.events.emit('notice', label);
    this.events.emit('state-change');
  }

  hitByBall() {
    if (!this.state.takeHit(this.time.now)) return;
    this.cameras.main.flash(180, 210, 50, 45);
    this.cameras.main.shake(250, 0.012);
    this.say(Math.random() < 0.82 ? 'SUCK MY ASS' : 'BACK TO BASE CAMP!');
    this.events.emit('state-change');
    if (this.state.phase === 'over') {
      this.player.disableBody(true, false);
      this.events.emit('game-over');
      return;
    }
    this.player.disableBody(true, true);
    this.time.delayedCall(850, () => {
      this.state.phase = 'playing';
      this.resetPlayer();
      this.events.emit('state-change');
    });
  }

  win() {
    if (!this.state.isPlaying()) return;
    this.state.phase = 'won';
    this.player.setVelocity(0, 0).body.setAllowGravity(false);
    this.say('THIS IS RIGGED!');
    this.events.emit('state-change');
    this.events.emit('game-won');
  }

  say(line) { this.events.emit('speech', line); }
}
