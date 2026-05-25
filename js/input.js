// =============================================================
//  INPUT MANAGER  (keyboard + on-screen touch buttons)
// =============================================================

class InputManager {
  constructor() {
    this.keys = {};
    this._justPressed = {};
    this._justReleased = {};

    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this._justPressed[e.code] = true;
      this.keys[e.code] = true;
      // prevent page scrolling with arrow keys / space
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))
        e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      this._justReleased[e.code] = true;
    });
  }

  // Call once per frame AFTER all game logic that reads justPressed
  flush() {
    this._justPressed = {};
    this._justReleased = {};
  }

  isDown(code)       { return !!this.keys[code]; }
  justPressed(code)  { return !!this._justPressed[code]; }
  justReleased(code) { return !!this._justReleased[code]; }

  // ── Logical actions (remappable) ───────────────────────────
  get left()   { return this.isDown('ArrowLeft')  || this.isDown('KeyA'); }
  get right()  { return this.isDown('ArrowRight') || this.isDown('KeyD'); }
  get up()     { return this.isDown('ArrowUp')    || this.isDown('KeyW'); }
  get run()    { return this.isDown('ShiftLeft')  || this.isDown('ShiftRight'); }
  get jumpDown() {
    return this._justPressed['ArrowUp']   || this._justPressed['KeyW'] ||
           this._justPressed['Space']     || this._justPressed['KeyZ'];
  }
  get jumpHeld() {
    return this.isDown('ArrowUp') || this.isDown('KeyW') ||
           this.isDown('Space')   || this.isDown('KeyZ');
  }
  get shootDown() {
    return this._justPressed['KeyX'] || this._justPressed['Period'] ||
           this._justPressed['ControlLeft'];
  }
  get pauseDown() {
    return this._justPressed['Escape'] || this._justPressed['KeyP'];
  }
  get anyDown() {
    return Object.keys(this._justPressed).length > 0;
  }

  // ── Touch / on-screen buttons ─────────────────────────────
  // Called by the UI overlay buttons
  virtualPress(action)   { this.keys['__virt_' + action] = true;  this._justPressed['__virt_' + action] = true; }
  virtualRelease(action) { this.keys['__virt_' + action] = false; this._justReleased['__virt_' + action] = true; }

  get leftTouch()  { return !!this.keys['__virt_left']; }
  get rightTouch() { return !!this.keys['__virt_right']; }
  get jumpTouch()  { return !!this.keys['__virt_jump']; }
  get shootTouch() { return !!this.keys['__virt_shoot']; }

  // Combined logical checks (keyboard OR touch)
  get moveLeft()  { return this.left  || this.leftTouch; }
  get moveRight() { return this.right || this.rightTouch; }
  get wantsJump() { return this.jumpDown || (!!this._justPressed['__virt_jump']); }
  get wantsShoot(){ return this.shootDown || (!!this._justPressed['__virt_shoot']); }
}

const input = new InputManager();
