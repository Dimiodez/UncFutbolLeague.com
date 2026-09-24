import { createTextures } from './ArtFactory.js';
import { ASSETS } from './AssetManifest.js';
import { BruceDirector } from './BruceDirector.js';
import { isTantrumLevel } from './campaign.js';
import { hasPhysicalRoute } from './CourseSafety.js';
import { GameState } from './GameState.js';
import { HazardDirector } from './HazardDirector.js';
import { InputController } from './InputController.js';
import { FALL_DEATH_Y, getStage, hasStage, TUNING, WORLD } from './level.js';

const SPEECH = ['NOT TODAY, UNC!', 'BALL INCOMING!', 'CLIMB FASTER!', 'WELCOME TO THE PIG PEN!', 'THE SUMMIT IS MINE!'];

export class MountainScene extends Phaser.Scene {
  constructor() { super('mountain'); }

  preload() {
    ASSETS.backgrounds.forEach((asset) => this.load.image(asset.key, asset.url));
    this.load.image(ASSETS.climber.key, ASSETS.climber.url);
    this.load.image(ASSETS.schwein.key, ASSETS.schwein.url);
    this.load.image(ASSETS.salmon.key, ASSETS.salmon.url);
    ASSETS.playerFrames.forEach((asset) => this.load.image(asset.key, asset.url));
    ASSETS.schweinFrames.forEach((asset) => this.load.image(asset.key, asset.url));
    ASSETS.schweinSalmonFrames.forEach((asset) => this.load.image(asset.key, asset.url));
    ASSETS.schweinRunFrames.forEach((asset) => this.load.image(asset.key, asset.url));
    ASSETS.schweinTantrumFrames.forEach((asset) => this.load.image(asset.key, asset.url));
    ASSETS.ballFrames.forEach((asset) => this.load.image(asset.key, asset.url));
    ASSETS.bruceRunFrames.forEach((asset) => this.load.image(asset.key, asset.url));
    ASSETS.bruceClimbFrames.forEach((asset) => this.load.image(asset.key, asset.url));
  }

  create() {
    createTextures(this);
    this.state = new GameState();
    this.inputController = new InputController(this);
    this.stage = getStage(1);
    this.drawMountain();
    this.courseVisuals = [];
    this.platforms = this.physics.add.staticGroup();
    this.puddles = this.physics.add.staticGroup();
    this.ballBumpers = this.physics.add.staticGroup();
    this.createCourse();
    this.createActors();
    this.hazards = new HazardDirector(this);
    this.bruce = new BruceDirector(this);
    this.createPhysics();
    this.events.on('schwein-line', (line) => this.say(line || Phaser.Utils.Array.GetRandom(SPEECH)));
    this.events.emit('game-ready', this);
  }

  drawMountain() {
    this.backgroundArt = this.add.image(WORLD.width / 2, WORLD.height / 2, this.stage.backgroundKey || ASSETS.background.key)
      .setDisplaySize(WORLD.width, WORLD.height)
      .setDepth(-10);
    this.add.rectangle(WORLD.width / 2, WORLD.height / 2, WORLD.width, WORLD.height, 0x0e3855, 0.16)
      .setDepth(-9);
  }

  createCourse() {
    this.platforms.clear(true, true);
    this.puddles.clear(true, true);
    this.ballBumpers.clear(true, true);
    this.courseVisuals.forEach((visual) => visual.destroy());
    this.courseVisuals = [];
    this.platformBodies = [];
    this.platformArts = [];
    this.stage.platforms.forEach((spec, index) => {
      const art = this.drawPlatformArt(spec, index);
      this.courseVisuals.push(art);
      this.platformArts[index] = art;
      const platform = this.platforms.create(spec.x, spec.y, 'platform');
      platform.setDisplaySize(spec.width, 24).refreshBody().setVisible(false).setDepth(5).setData('platformIndex', index);
      platform.body.checkCollision.down = false;
      platform.body.checkCollision.left = false;
      platform.body.checkCollision.right = false;
      this.platformBodies[index] = platform;
    });
    this.ladders = this.stage.ladders.map((ladder, index) => {
      const top = ladder.top + 8;
      const bottom = ladder.bottom - 8;
      const height = bottom - top;
      const g = this.add.graphics().setDepth(4);
      g.lineStyle(6, 0xb97843).lineBetween(ladder.x - 16, top, ladder.x - 16, bottom).lineBetween(ladder.x + 16, top, ladder.x + 16, bottom);
      g.lineStyle(4, 0xe0aa63);
      for (let y = top + 7; y < bottom; y += 18) g.lineBetween(ladder.x - 16, y, ladder.x + 16, y);
      this.courseVisuals.push(g);
      return { ...ladder, id: ladder.id || `ladder-${index}`, top, bottom, height, graphic: g };
    });
    const { summit } = this.stage;
    this.courseVisuals.push(
      this.add.rectangle(summit.x, summit.y - 23, 5, 58, 0xf7f5df).setDepth(6),
      this.add.triangle(summit.x + 20, summit.y - 45, 0, 0, 42, 12, 0, 24, 0xd64d3d).setDepth(6),
      this.add.text(summit.x - 42, summit.y + 4, 'SUMMIT', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', backgroundColor: '#15344d', padding: { x: 5, y: 3 } }).setDepth(7),
    );
    this.stage.puddles.forEach(({ x, y }) => {
      const puddle = this.puddles.create(x, y, 'puddle').setDisplaySize(64, 19).setDepth(7);
      puddle.refreshBody().setData('safeUntil', 0);
    });
    this.stage.ballBumpers.forEach((spec) => {
      const y = this.stage.platforms[spec.platformIndex].y - 31;
      const art = this.add.graphics().setDepth(6);
      art.fillStyle(0x243f54, 1).fillRoundedRect(spec.x - 8, y - 18, 16, 38, 5);
      art.fillStyle(0xeaf5f3, 1).fillRoundedRect(spec.x - 10, y - 20, 20, 9, 4);
      this.courseVisuals.push(art);
      const bumper = this.ballBumpers.create(spec.x, y, 'platform');
      bumper.setDisplaySize(16, 38).refreshBody().setVisible(false).setData('direction', spec.direction);
    });
  }

  drawPlatformArt(spec, index) {
    const left = spec.x - spec.width / 2;
    const top = spec.y - 12;
    const g = this.add.graphics().setDepth(5);
    const style = spec.style || 'snow';
    const rocky = style === 'rock';
    const icy = style === 'ice';
    g.fillStyle(rocky ? 0x1c1a1c : 0x102b3d, 0.48).fillRoundedRect(left + 7, top + 15, spec.width, 25, 8);
    if (rocky) g.fillGradientStyle(0x67594f, 0x51463f, 0x342f31, 0x201f25, 1).fillRoundedRect(left, top + 5, spec.width, 28, 7);
    else if (icy) g.fillGradientStyle(0x6f96a8, 0x557b91, 0x31576d, 0x203e52, 1).fillRoundedRect(left, top + 5, spec.width, 28, 7);
    else g.fillGradientStyle(0x536d7d, 0x3f596b, 0x243f54, 0x172f43, 1).fillRoundedRect(left, top + 5, spec.width, 28, 7);
    const facets = Math.max(5, Math.floor(spec.width / 115));
    for (let i = 0; i < facets; i += 1) {
      const x = left + 18 + i * (spec.width - 36) / facets;
      const w = 54 + (i % 3) * 13;
      const facetColor = rocky ? (i % 2 ? 0x7a6658 : 0x3e3736) : (i % 2 ? 0x678293 : 0x2d4a5e);
      g.fillStyle(facetColor, 0.68).fillTriangle(x, top + 31, x + w * 0.45, top + 9, x + w, top + 31);
    }
    const capHeight = rocky ? 7 : 15;
    g.fillGradientStyle(icy ? 0xd9f7ff : 0xffffff, 0xeaf5f3, 0xd8ecec, rocky ? 0xc7d1cf : 0xbfdcde, 1)
      .fillRoundedRect(left - 3, top + (15 - capHeight) - 3, spec.width + 6, capHeight, rocky ? 3 : 7);
    g.lineStyle(2, 0xffffff, 0.72).lineBetween(left + 7, top + 2, left + spec.width * 0.42, top).lineBetween(left + spec.width * 0.58, top + 2, left + spec.width - 9, top + 1);
    const icicleSpacing = rocky ? 150 : 92;
    for (let x = left + 38 + index * 11; x < left + spec.width - 22; x += icicleSpacing) {
      const length = 9 + ((Math.round(x) + index * 7) % 15);
      if (!rocky) g.fillStyle(0xd8f0f2, 0.95).fillTriangle(x, top + 10, x + 9, top + 10, x + 4, top + 10 + length);
    }
    return g;
  }

  createActors() {
    this.createCharacterAnimations();
    this.schwein = this.add.sprite(744, 105, ASSETS.schweinFrames[0].key).setDisplaySize(210, 210).setDepth(9);
    this.schwein.play('schwein-idle');
    const { playerStart } = this.stage;
    this.player = this.physics.add.sprite(playerStart.x, playerStart.y, 'player').setScale(0.5).setVisible(false).setDepth(10);
    this.player.body.setSize(42, 74).setOffset(7, 3).setMaxVelocity(220, 520);
    this.player.setCollideWorldBounds(true);
    this.player.climbing = false;
    this.playerArt = this.add.sprite(playerStart.x, this.player.body.bottom, ASSETS.playerFrames[0].key)
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
    const runKeys = ASSETS.schweinRunFrames.map((asset) => ({ key: asset.key }));
    this.anims.create({ key: 'schwein-run', frames: runKeys, frameRate: 9, repeat: -1 });
    const tantrumKeys = ASSETS.schweinTantrumFrames.map((asset) => ({ key: asset.key }));
    this.anims.create({ key: 'schwein-tantrum', frames: tantrumKeys, frameRate: 7, repeat: 0 });
    const ballKeys = ASSETS.ballFrames.map((asset) => ({ key: asset.key }));
    this.anims.create({ key: 'soccer-roll', frames: ballKeys, frameRate: 10, repeat: -1 });
    const bruceRunKeys = ASSETS.bruceRunFrames.map((asset) => ({ key: asset.key }));
    const bruceClimbKeys = ASSETS.bruceClimbFrames.map((asset) => ({ key: asset.key }));
    this.anims.create({ key: 'bruce-run', frames: bruceRunKeys, frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'bruce-climb', frames: bruceClimbKeys, frameRate: 8, repeat: -1 });
  }

  createPhysics() {
    const allowPlayerPlatform = () => !this.player.climbing;
    this.physics.add.collider(this.player, this.platforms, null, allowPlayerPlatform);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height + 80);
    this.physics.add.collider(this.hazards.balls, this.platforms, (ball, platform) => this.hazards.ballLanded(ball, platform));
    this.physics.add.collider(this.hazards.balls, this.ballBumpers, (ball, bumper) => this.hazards.ballHitBumper(ball, bumper));
    this.physics.add.collider(
      this.hazards.salmon,
      this.platforms,
      (fish) => this.hazards.salmonLanded(fish),
      (fish, platform) => this.hazards.shouldSalmonLand(fish, platform),
    );
    this.physics.add.overlap(this.player, this.hazards.balls, () => this.hitByBall());
    this.physics.add.overlap(this.player, this.hazards.salmon, (_player, fish) => this.slip('SALMON SLIP!', fish));
    this.physics.add.overlap(this.player, this.bruce.sprite, () => this.slip('BRUCE BODY CHECK!', null, false));
    this.physics.add.overlap(
      this.player,
      this.puddles,
      (_player, puddle) => this.slip('BRUCE SWEAT SLIDE!', puddle, false),
      (player, puddle) => this.canTriggerPuddle(player, puddle),
    );
  }

  startRun(level = 1, resetLives = true) {
    const nextStage = getStage(level) || getStage(1);
    this.state.startLevel(nextStage.level, { resetLives });
    this.stage = nextStage;
    this.backgroundArt.setTexture(nextStage.backgroundKey || ASSETS.background.key);
    this.createCourse();
    this.inputController.clear();
    this.resetPlayer();
    this.resetSchwein();
    this.hazards.reset(this.time.now);
    this.bruce.reset(this.time.now);
    this.resetStageEvents();
    this.say(nextStage.level === 1 ? 'GET OFF MY MOUNTAIN!' : 'YOU AGAIN? KEEP CLIMBING!');
    this.events.emit('state-change');
  }

  resetSchwein() {
    this.tantrumActive = false;
    this.tweens.killTweensOf(this.schwein);
    this.schwein
      .setPosition(744, 105)
      .setVisible(true)
      .setAlpha(1)
      .setFlipX(false)
      .setDisplaySize(210, 210)
      .play('schwein-idle', true);
  }

  resetPlayer() {
    const { playerStart } = this.stage;
    this.player.enableBody(true, playerStart.x, playerStart.y, true, true);
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
    this.fallResetPending = false;
  }

  nearestLadder() {
    return this.ladders.find((ladder) => Math.abs(this.player.x - ladder.x) < 28 && this.player.y > ladder.top - 36 && this.player.y < ladder.bottom + 30);
  }

  update(time, delta) {
    if (!this.state?.isPlaying()) return;
    if (this.player.y > FALL_DEATH_Y) {
      this.loseLife('fall');
      return;
    }
    this.hazards.update(time);
    this.bruce.update(time, delta);
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
    if (this.player.x > this.stage.summit.x - 32 && this.player.y < 180) this.win();
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
    if (this.tantrumActive) return;
    this.schwein.play(hazard === 'salmon' ? 'schwein-salmon-throw' : 'schwein-throw', true);
    this.time.delayedCall(650, () => {
      if (this.schwein?.active && !this.tantrumActive) this.schwein.play('schwein-idle', true);
    });
  }

  playSchweinTantrum(onImpact) {
    this.tantrumActive = true;
    this.schwein.play('schwein-tantrum', true);
    this.tweens.add({
      targets: this.schwein,
      y: 48,
      duration: 180,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.Out',
    });
    this.time.delayedCall(650, () => {
      this.cameras.main.shake(520, 0.022);
      this.cameras.main.flash(150, 245, 235, 215, false);
      this.knockPlayerFromTantrum();
      onImpact?.();
    });
    this.time.delayedCall(930, () => {
      this.tantrumActive = false;
      if (this.schwein?.active && this.state.isPlaying()) {
        this.schwein.setY(105).play('schwein-idle', true);
      }
    });
  }

  resetStageEvents() {
    this.tantrumTimer?.remove(false);
    this.tantrumTimer = null;
    if (!isTantrumLevel(this.state.level) || !this.stage.route || !this.stage.disruptions?.length) return;
    this.tantrumTimer = this.time.delayedCall(this.stage.tantrumDelay ?? 12000, () => this.triggerTantrum());
  }

  triggerTantrum() {
    if (!this.state.isPlaying()) return;
    const disruption = this.stage.disruptions[0];
    if (!disruption || !hasPhysicalRoute(this.stage.route, disruption.disableEdgeIds)) return;
    this.say('I WILL BREAK THIS MOUNTAIN!');
    this.playSchweinTantrum(() => this.applyDisruption(disruption));
  }

  applyDisruption(disruption) {
    if (disruption.kind !== 'platform-gaps') return;
    disruption.gaps.forEach((gap) => this.breakPlatformGap(gap));
    this.events.emit('notice', 'SCHWEIN SHATTERED A BALL ROUTE THROUGH THE MOUNTAIN!');
  }

  breakPlatformGap(gap) {
    const platformSpec = this.stage.platforms[gap.platformIndex];
    const platformBody = this.platformBodies[gap.platformIndex];
    const platformArt = this.platformArts[gap.platformIndex];
    if (!platformSpec || !platformBody || !platformArt) return;
    const left = platformSpec.x - platformSpec.width / 2;
    const right = left + platformSpec.width;
    const gapLeft = gap.gapX - gap.gapWidth / 2;
    const gapRight = gap.gapX + gap.gapWidth / 2;
    const leftSpec = { ...platformSpec, x: left + (gapLeft - left) / 2, width: gapLeft - left };
    const rightSpec = { ...platformSpec, x: gapRight + (right - gapRight) / 2, width: right - gapRight };
    const fallingSpec = { ...platformSpec, x: gap.gapX, width: gap.gapWidth };

    platformArt.destroy();
    platformBody.destroy();
    const leftArt = this.drawPlatformArt(leftSpec, gap.platformIndex);
    const rightArt = this.drawPlatformArt(rightSpec, gap.platformIndex);
    const fallingArt = this.drawPlatformArt(fallingSpec, gap.platformIndex).setDepth(6);
    this.platformArts[gap.platformIndex] = [leftArt, rightArt];
    this.courseVisuals.push(leftArt, rightArt, fallingArt);
    const createSegmentBody = (spec) => {
      const body = this.platforms.create(spec.x, spec.y, 'platform');
      body.setDisplaySize(spec.width, 24).refreshBody().setVisible(false).setDepth(5).setData('platformIndex', gap.platformIndex);
      body.body.checkCollision.down = false;
      body.body.checkCollision.left = false;
      body.body.checkCollision.right = false;
      return body;
    };
    this.platformBodies[gap.platformIndex] = [createSegmentBody(leftSpec), createSegmentBody(rightSpec)];
    this.tweens.add({
      targets: fallingArt,
      y: fallingArt.y + 230,
      angle: 8,
      alpha: 0.18,
      duration: 850,
      ease: 'Quad.In',
    });
  }

  knockPlayerFromTantrum() {
    if (!this.state.isPlaying()) return;
    this.state.stun(this.time.now, 1250);
    this.stopClimbing();
    const shove = this.player.x < WORLD.width / 2 ? -95 : 95;
    this.player.setVelocity(shove, -145);
    this.playerArt.play('player-slip', true);
    this.events.emit('notice', 'THE MOUNTAIN BUCKED YOU OFF YOUR FEET!');
    this.events.emit('state-change');
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

  hitByBall() { this.loseLife('ball'); }

  loseLife(source) {
    if (source === 'fall' && this.fallResetPending) return;
    if (source === 'fall') this.fallResetPending = true;
    if (!this.state.takeHit(this.time.now)) {
      if (source === 'fall') this.resetPlayer();
      return;
    }
    this.cameras.main.flash(180, 210, 50, 45);
    this.cameras.main.shake(250, 0.012);
    this.say(source === 'fall'
      ? 'LONG WAY DOWN, REF!'
      : Math.random() < 0.82 ? 'SUCK MY ASS' : 'BACK TO BASE CAMP!');
    this.events.emit('state-change');
    if (this.state.phase === 'over') {
      this.bruce.clear();
      this.player.disableBody(true, false);
      this.playerArt.play('player-hurt', true).setAlpha(0.72);
      this.events.emit('game-over');
      return;
    }
    this.player.disableBody(true, true);
    this.playerArt.play('player-hurt', true);
    this.time.delayedCall(220, () => this.playerArt.setVisible(false));
    this.time.delayedCall(source === 'fall' ? 650 : 850, () => {
      this.state.phase = 'playing';
      this.resetPlayer();
      this.events.emit('state-change');
    });
  }

  win() {
    if (!this.state.isPlaying()) return;
    this.state.phase = 'won';
    this.player.setVelocity(0, 0).body.setAllowGravity(false);
    this.hazards.clear();
    this.bruce.clear();
    this.tantrumTimer?.remove(false);
    this.say(this.state.summitOutcome() === 'red-card' ? 'NOT THE RED CARD!' : 'YOU HAVE NOT CAUGHT ME YET!');
    this.events.emit('state-change');
    this.schwein.setDisplaySize(190, 190).play('schwein-run', true);
    this.tweens.add({
      targets: this.schwein,
      x: WORLD.width + 125,
      y: 112,
      duration: 1250,
      ease: 'Linear',
      onComplete: () => {
        const event = this.state.summitOutcome() === 'red-card' ? 'red-card-won' : 'game-won';
        this.events.emit(event, {
          level: this.state.level,
          totalLevels: this.state.totalLevels,
          nextLevel: hasStage(this.state.level + 1) ? this.state.level + 1 : null,
        });
      },
    });
  }

  say(line) { this.events.emit('speech', line); }
}
