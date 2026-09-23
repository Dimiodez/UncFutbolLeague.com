import { createTextures } from './ArtFactory.js';
import { ASSETS } from './AssetManifest.js';
import { GameState } from './GameState.js';
import { HazardDirector } from './HazardDirector.js';
import { InputController } from './InputController.js';
import { LADDERS, PLATFORMS, PLAYER_START, SUMMIT, TUNING, WORLD } from './level.js';

const SPEECH = ['NOT TODAY, UNC!', 'BALL INCOMING!', 'CLIMB FASTER!', 'WELCOME TO THE PIG PEN!', 'THE SUMMIT IS MINE!'];

export class MountainScene extends Phaser.Scene {
  constructor() { super('mountain'); }

  preload() {
    this.load.image(ASSETS.climber.key, ASSETS.climber.url);
    this.load.image(ASSETS.schwein.key, ASSETS.schwein.url);
    this.load.image(ASSETS.salmon.key, ASSETS.salmon.url);
    ASSETS.playerFrames.forEach((asset) => this.load.image(asset.key, asset.url));
    ASSETS.schweinFrames.forEach((asset) => this.load.image(asset.key, asset.url));
    ASSETS.schweinSalmonFrames.forEach((asset) => this.load.image(asset.key, asset.url));
  }

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
    g.fillGradientStyle(0x2e87cf, 0x5da8dc, 0xc6dfe2, 0xeaf1df, 1);
    g.fillRect(0, 0, WORLD.width, WORLD.height);
    g.fillStyle(0xfff4bd, 0.9).fillCircle(102, 79, 39);
    g.fillStyle(0xffffff, 0.22).fillCircle(91, 68, 26);
    for (let i = 0; i < 7; i += 1) {
      const x = 80 + i * 155;
      g.fillStyle(0xf4fbfa, 0.78).fillEllipse(x, 95 + (i % 2) * 25, 130, 28);
    }
    g.fillGradientStyle(0x5c86a3, 0x426d8b, 0x244d68, 0x183c55, 1).fillTriangle(20, 720, 470, 40, 920, 720);
    g.fillGradientStyle(0x7595a9, 0x567d98, 0x315874, 0x25475f, 1).fillTriangle(260, 720, 655, 105, 960, 720);
    g.fillStyle(0xf5fbfa).fillTriangle(332, 250, 470, 40, 585, 220);
    g.fillStyle(0xd5e9e8).fillTriangle(535, 292, 655, 105, 742, 260);
    g.fillStyle(0x1d4057, 0.9).fillTriangle(20, 720, 240, 360, 315, 720);
    for (let y = 250; y < 700; y += 75) {
      g.fillStyle(0x183b50, 0.4).fillTriangle(250, y, 300, y - 50, 345, y);
      g.fillTriangle(640, y + 20, 700, y - 35, 750, y + 20);
    }
  }

  createCourse() {
    this.platforms = this.physics.add.staticGroup();
    PLATFORMS.forEach((spec, index) => {
      this.drawPlatformArt(spec, index);
      const platform = this.platforms.create(spec.x, spec.y, 'platform');
      platform.setDisplaySize(spec.width, 24).refreshBody().setVisible(false).setDepth(5).setData('platformIndex', index);
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
      const puddle = this.puddles.create(x, y, 'puddle').setDisplaySize(48, 14).setDepth(6);
      puddle.refreshBody().setData('safeUntil', 0);
    });
    this.add.text(345, 449, 'BRUCE WAS HERE', { fontFamily: 'monospace', fontSize: '10px', color: '#9fd8df' }).setDepth(6);
  }

  drawPlatformArt(spec, index) {
    const left = spec.x - spec.width / 2;
    const top = spec.y - 12;
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(0x102b3d, 0.42).fillRoundedRect(left + 7, top + 15, spec.width, 25, 8);
    g.fillGradientStyle(0x536d7d, 0x3f596b, 0x243f54, 0x172f43, 1).fillRoundedRect(left, top + 5, spec.width, 28, 7);
    const facets = Math.max(5, Math.floor(spec.width / 115));
    for (let i = 0; i < facets; i += 1) {
      const x = left + 18 + i * (spec.width - 36) / facets;
      const w = 54 + (i % 3) * 13;
      g.fillStyle(i % 2 ? 0x678293 : 0x2d4a5e, 0.6).fillTriangle(x, top + 31, x + w * 0.45, top + 9, x + w, top + 31);
    }
    g.fillGradientStyle(0xffffff, 0xeaf5f3, 0xd8ecec, 0xbfdcde, 1).fillRoundedRect(left - 3, top - 3, spec.width + 6, 15, 7);
    g.lineStyle(2, 0xffffff, 0.72).lineBetween(left + 7, top + 2, left + spec.width * 0.42, top).lineBetween(left + spec.width * 0.58, top + 2, left + spec.width - 9, top + 1);
    const icicleSpacing = 92;
    for (let x = left + 38 + index * 11; x < left + spec.width - 22; x += icicleSpacing) {
      const length = 9 + ((Math.round(x) + index * 7) % 15);
      g.fillStyle(0xd8f0f2, 0.95).fillTriangle(x, top + 10, x + 9, top + 10, x + 4, top + 10 + length);
    }
  }

  createActors() {
    this.createCharacterAnimations();
    this.schwein = this.add.sprite(744, 105, ASSETS.schweinFrames[0].key).setDisplaySize(210, 210).setDepth(9);
    this.schwein.play('schwein-idle');
    this.player = this.physics.add.sprite(PLAYER_START.x, PLAYER_START.y, 'player').setScale(0.5).setVisible(false).setDepth(10);
    this.player.body.setSize(42, 74).setOffset(7, 3).setMaxVelocity(220, 520);
    this.player.setCollideWorldBounds(true);
    this.player.climbing = false;
    this.playerArt = this.add.sprite(PLAYER_START.x, this.player.body.bottom, ASSETS.playerFrames[0].key)
      .setOrigin(0.5, 1)
      .setDisplaySize(80, 80)
      .setDepth(10);
    this.playerArt.play('player-idle');
  }

  createCharacterAnimations() {
    const keys = ASSETS.playerFrames.map((asset) => ({ key: asset.key }));
    this.anims.create({ key: 'player-idle', frames: [keys[0]], frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'player-run', frames: keys.slice(1, 3), frameRate: 9, repeat: -1 });
    this.anims.create({ key: 'player-climb', frames: keys.slice(3, 5), frameRate: 7, repeat: -1 });
    this.anims.create({ key: 'player-jump', frames: [keys[5]], frameRate: 1 });
    this.anims.create({ key: 'player-slip', frames: [keys[6]], frameRate: 1 });
    this.anims.create({ key: 'player-hurt', frames: [keys[7]], frameRate: 1 });
    const pigKeys = ASSETS.schweinFrames.map((asset) => ({ key: asset.key }));
    this.anims.create({ key: 'schwein-idle', frames: [pigKeys[0]], frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'schwein-throw', frames: pigKeys, frameRate: 7, repeat: 0 });
    const salmonKeys = ASSETS.schweinSalmonFrames.map((asset) => ({ key: asset.key }));
    this.anims.create({ key: 'schwein-salmon-throw', frames: salmonKeys, frameRate: 7, repeat: 0 });
  }

  createPhysics() {
    const allowPlayerPlatform = () => !this.player.climbing;
    this.physics.add.collider(this.player, this.platforms, null, allowPlayerPlatform);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height + 80);
    this.time.delayedCall(0, () => {
      this.physics.add.collider(this.hazards.balls, this.platforms, (ball, platform) => this.hazards.ballLanded(ball, platform));
      this.physics.add.collider(
        this.hazards.salmon,
        this.platforms,
        (fish) => this.hazards.salmonLanded(fish),
        (fish, platform) => this.hazards.shouldSalmonLand(fish, platform),
      );
      this.physics.add.overlap(this.player, this.hazards.balls, () => this.hitByBall());
      this.physics.add.overlap(this.player, this.hazards.salmon, (_player, fish) => this.slip('SALMON SLIP!', fish));
    });
    this.physics.add.overlap(
      this.player,
      this.puddles,
      (_player, puddle) => this.slip('BRUCE SWEAT SLIDE!', puddle, false),
      (player, puddle) => this.canTriggerPuddle(player, puddle),
    );
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
    this.player.setTexture('player').setScale(0.5).setVisible(false).setAngle(0).setAlpha(1).setVelocity(0, 0);
    this.player.body.setAllowGravity(true);
    this.player.climbing = false;
    this.playerArt
      .setVisible(true)
      .setPosition(this.player.x, this.player.body.bottom)
      .setAngle(0)
      .setAlpha(1)
      .setDisplaySize(80, 80)
      .play('player-idle');
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
      this.updatePlayerArt(time, 0, 0);
      return;
    }
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
    this.updatePlayerArt(time, horizontal, vertical);
    if (this.player.x > SUMMIT.x - 32 && this.player.y < 180) this.win();
  }

  updatePlayerArt(time, horizontal = 0, vertical = 0) {
    if (!this.playerArt.visible) return;
    let animation = 'player-idle';
    if (this.state.isStunned(time)) {
      animation = 'player-slip';
    } else if (this.player.climbing) {
      animation = 'player-climb';
    } else if (!this.player.body.blocked.down) {
      animation = 'player-jump';
    } else if (horizontal !== 0) {
      animation = 'player-run';
    }
    // The animation frames are bottom-centre normalized. Anchor their feet to
    // the physics body's bottom instead of centering them on the body.
    this.playerArt.setPosition(this.player.x, this.player.body.bottom).play(animation, true);
    if (horizontal !== 0) this.playerArt.setFlipX(horizontal < 0);
  }

  animateSchwein(hazard = 'ball') {
    this.schwein.play(hazard === 'salmon' ? 'schwein-salmon-throw' : 'schwein-throw', true);
    this.time.delayedCall(650, () => {
      if (this.schwein?.active) this.schwein.play('schwein-idle', true);
    });
  }

  stopClimbing() {
    this.player.climbing = false;
    this.player.body.setAllowGravity(true);
  }

  canTriggerPuddle(player, puddle) {
    return player.body.blocked.down
      && !this.state.isStunned(this.time.now)
      && this.time.now >= (puddle.getData('safeUntil') || 0);
  }

  slip(label, hazard, consumeHazard = true) {
    if (!this.state.isPlaying() || this.state.isStunned(this.time.now)) return;
    this.state.stun(this.time.now, TUNING.stunMs);
    this.stopClimbing();
    this.player.setVelocity(0, 0);
    if (hazard?.active && consumeHazard) {
      hazard.destroy();
    } else if (hazard?.active) {
      hazard.setData('safeUntil', this.time.now + TUNING.stunMs + TUNING.puddleEscapeGraceMs);
    }
    this.cameras.main.shake(120, 0.006);
    this.events.emit('notice', label);
    this.events.emit('state-change');
    this.time.delayedCall(TUNING.stunMs, () => this.events.emit('state-change'));
  }

  hitByBall() {
    if (!this.state.takeHit(this.time.now)) return;
    this.cameras.main.flash(180, 210, 50, 45);
    this.cameras.main.shake(250, 0.012);
    this.say(Math.random() < 0.82 ? 'SUCK MY ASS' : 'BACK TO BASE CAMP!');
    this.events.emit('state-change');
    if (this.state.phase === 'over') {
      this.player.disableBody(true, false);
      this.playerArt.play('player-hurt', true).setAlpha(0.72);
      this.events.emit('game-over');
      return;
    }
    this.player.disableBody(true, true);
    this.playerArt.play('player-hurt', true);
    this.time.delayedCall(220, () => this.playerArt.setVisible(false));
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
