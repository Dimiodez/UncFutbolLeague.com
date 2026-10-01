import { ASSETS } from './AssetManifest.js';
import { BIZZIE_REVEAL_LINE } from './Dialogue.js';

export const BIZZIE_PLAYER_BLOCKER_HEIGHT = 72;
export const BIZZIE_PLAYER_BLOCKER_WIDTH = 92;

export const nextBizzieDeflection = (previousDirection) => (previousDirection < 0 ? 1 : -1);

export class BizzieDirector {
  constructor(scene) {
    this.scene = scene;
    this.visual = scene.add.sprite(-200, -200, ASSETS.bizzieLandFrames[0].key)
      .setOrigin(0.5, 1)
      .setDisplaySize(124, 124)
      .setDepth(12)
      .setVisible(false);
    this.playerBlocker = scene.physics.add.staticImage(-200, -200, 'platform').setVisible(false);
    this.ballBlocker = scene.physics.add.staticImage(-200, -200, 'platform').setVisible(false);
    this.playerBlocker.disableBody(true, true);
    this.ballBlocker.disableBody(true, true);
    this.revealTimer = null;
    this.telegraphTimer = null;
    this.telegraphVisual = null;
    this.active = false;
    this.playerBumpAt = 0;
    this.lastDeflectionDirection = 1;
    this.awaitingChoice = false;
  }

  reset() {
    this.clear();
    const spec = this.scene.stage.bizzie;
    if (!spec) return;
    if (spec.adaptiveChoices) {
      this.baseSpec = spec;
      this.choiceOriginX = this.scene.stage.playerStart.x;
      this.awaitingChoice = true;
      return;
    }
    this.schedule(spec);
  }

  update() {
    if (!this.awaitingChoice || !this.scene.state.isPlaying()) return;
    const delta = this.scene.player.x - this.choiceOriginX;
    if (Math.abs(delta) < (this.baseSpec.decisionThreshold ?? 48)) return;
    const side = delta < 0 ? 'left' : 'right';
    const choice = this.baseSpec.adaptiveChoices?.[side];
    if (!choice) return;
    this.awaitingChoice = false;
    this.schedule({ ...this.baseSpec, ...choice, chosenSide: side });
  }

  schedule(spec) {
    const platform = this.scene.stage.platforms[spec.platformIndex];
    if (!platform) return;
    this.spec = spec;
    this.surfaceY = platform.y - 12;
    this.telegraphTimer = this.scene.time.delayedCall(spec.telegraphDelay ?? 700, () => this.telegraph());
    this.revealTimer = this.scene.time.delayedCall(spec.revealDelay ?? 2600, () => this.reveal());
  }

  telegraph() {
    if (!this.spec || !this.scene.state.isPlaying()) return;
    const marker = this.scene.add.ellipse(0, 0, 112, 24, 0xf8fff4, 0.28)
      .setStrokeStyle(5, 0x159447, 0.95);
    const warningPlate = this.scene.add.rectangle(0, -54, 138, 42, 0x0b4123, 0.94)
      .setStrokeStyle(3, 0xf8fff4, 1);
    const warning = this.scene.add.text(0, -54, 'ROUTE BLOCKED', {
      fontFamily: 'monospace',
      fontStyle: 'bold',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.telegraphVisual = this.scene.add.container(
      this.spec.x,
      this.surfaceY - 4,
      [marker, warningPlate, warning],
    ).setDepth(13);
    this.scene.tweens.add({
      targets: this.telegraphVisual,
      alpha: 0.68,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  reveal() {
    if (!this.spec || !this.scene.state.isPlaying()) return;
    const { x } = this.spec;
    this.destroyTelegraph();
    this.visual.setPosition(x, this.surfaceY).setVisible(true).setAlpha(1).setScale(1).play('bizzie-land', true);
    this.visual.once('animationcomplete-bizzie-land', () => this.lockLane());
  }

  lockLane() {
    if (!this.spec || !this.scene.state.isPlaying()) return;
    const { x } = this.spec;
    this.active = true;
    this.playerBlocker.enableBody(true, x, this.surfaceY - BIZZIE_PLAYER_BLOCKER_HEIGHT / 2, true, false)
      .setDisplaySize(BIZZIE_PLAYER_BLOCKER_WIDTH, BIZZIE_PLAYER_BLOCKER_HEIGHT)
      .refreshBody();
    this.ballBlocker.enableBody(true, x, this.surfaceY - 49, true, false)
      .setDisplaySize(82, 98)
      .refreshBody();
    this.makeSnowPuff(x, this.surfaceY);
    if (this.spec.slamOnLand) this.scene.knockPlayerFromBizzie();
    this.scene.say(BIZZIE_REVEAL_LINE);
    this.visual.play('bizzie-block', true);
  }

  makeSnowPuff(x, y) {
    for (const offset of [-28, -15, 15, 28]) {
      const puff = this.scene.add.circle(x + offset, y - 4, 7, 0xeaf7f5, 0.9).setDepth(11);
      this.scene.tweens.add({
        targets: puff,
        x: x + offset * 1.55,
        y: y - 20 - Math.abs(offset) * 0.2,
        alpha: 0,
        scale: 1.6,
        duration: 420,
        ease: 'Quad.Out',
        onComplete: () => puff.destroy(),
      });
    }
  }

  blockPlayer(player) {
    if (!this.active || this.scene.time.now < this.playerBumpAt) return;
    this.playerBumpAt = this.scene.time.now + 360;
    const direction = player.x < this.visual.x ? -1 : 1;
    this.scene.stopClimbing();
    if (this.spec.knockDownOnContact) {
      this.scene.state.stun(this.scene.time.now, 650);
      player.setVelocity(direction * 90, 135);
      this.scene.playerArt.play('player-slip', true);
      this.scene.events.emit('state-change');
    } else {
      player.setVelocityX(direction * 90);
    }
    this.scene.tweens.add({
      targets: this.visual,
      scaleX: 1.035,
      scaleY: 0.97,
      duration: 75,
      yoyo: true,
      ease: 'Quad.Out',
    });
  }

  deflectBall(first, second = null) {
    const ball = first?.body?.moves ? first : second?.body?.moves ? second : null;
    if (!this.active || !ball?.active) return;
    const now = this.scene.time.now;
    if (now < (ball.getData('bizzieDeflectLockUntil') || 0)) return;
    const direction = nextBizzieDeflection(this.lastDeflectionDirection);
    this.lastDeflectionDirection = direction;
    const speed = this.scene.stage.tuning.ballSpeed;
    // Bizzie changes the lane, not the danger. Give the ball a short lateral
    // pop and let normal gravity/platform physics carry it down the mountain.
    ball.setData('bizzieDeflectLockUntil', now + 2400)
      .setPosition(this.visual.x + direction * 54, this.surfaceY - 22)
      .setVelocity(direction * speed * 1.18, -105);
    if (direction < 0) ball.playReverse('soccer-roll', true);
    else ball.play('soccer-roll', true);
    this.visual.play('bizzie-impact', true);
    this.visual.once('animationcomplete-bizzie-impact', () => {
      if (this.active) this.visual.play('bizzie-block', true);
    });
  }

  destroyTelegraph() {
    if (!this.telegraphVisual) return;
    this.scene.tweens.killTweensOf(this.telegraphVisual);
    this.telegraphVisual.destroy(true);
    this.telegraphVisual = null;
  }

  clear() {
    this.revealTimer?.remove(false);
    this.telegraphTimer?.remove(false);
    this.revealTimer = null;
    this.telegraphTimer = null;
    this.destroyTelegraph();
    this.scene.tweens.killTweensOf(this.visual);
    this.visual.stop().setVisible(false).setPosition(-200, -200).setScale(1);
    this.playerBlocker.disableBody(true, true);
    this.ballBlocker.disableBody(true, true);
    this.active = false;
    this.awaitingChoice = false;
    this.lastDeflectionDirection = 1;
    this.baseSpec = null;
    this.spec = null;
  }
}
