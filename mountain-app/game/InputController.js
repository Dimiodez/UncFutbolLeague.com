const KEY_BINDINGS = {
  left: ['LEFT', 'A'], right: ['RIGHT', 'D'],
  up: ['UP', 'W'], down: ['DOWN', 'S'], jump: ['SPACE'],
};

export class InputController {
  constructor(scene) {
    this.scene = scene;
    this.touch = { left: false, right: false, up: false, down: false, jump: false };
    this.jumpQueued = false;
    this.keys = scene.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE');
    this.keys.SPACE.on('down', () => { this.jumpQueued = true; });
    this.bindTouch();
  }

  bindTouch() {
    document.querySelectorAll('[data-control]').forEach((button) => {
      const control = button.dataset.control;
      const press = (event) => {
        event.preventDefault();
        this.touch[control] = true;
        if (control === 'jump') this.jumpQueued = true;
      };
      const release = (event) => {
        event.preventDefault();
        this.touch[control] = false;
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    });
  }

  down(action) {
    return this.touch[action] || KEY_BINDINGS[action].some((name) => this.keys[name].isDown);
  }

  consumeJump() {
    const value = this.jumpQueued;
    this.jumpQueued = false;
    return value;
  }

  clear() {
    Object.keys(this.touch).forEach((key) => { this.touch[key] = false; });
    this.jumpQueued = false;
  }
}
