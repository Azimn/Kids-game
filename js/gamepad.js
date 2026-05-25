/*
  GAMEPAD INPUT
  Supports standard gamepads (Xbox, PlayStation, generic USB).
  Button mapping follows the Standard Gamepad layout.
  Updates the same `keys` object that keyboard input uses,
  so the game code doesn't need to know the input source.
*/

const KQ_GAMEPAD = (() => {
  // Standard Gamepad button indices
  const BTN = {
    A:      0,   // Cross / A — jump
    B:      1,   // Circle / B — dash
    X:      2,   // Square / X — shoot
    Y:      3,   // Triangle / Y
    LB:     4,
    RB:     5,
    LT:     6,
    RT:     7,
    SELECT: 8,
    START:  9,
    L3:     10,
    R3:     11,
    UP:     12,  // D-Pad
    DOWN:   13,
    LEFT:   14,
    RIGHT:  15,
  };

  const AXIS_THRESHOLD = 0.25;

  // These are injected by game.js so the gamepad can write into the same input map
  let _keys = null;
  let _onStart = null;
  let _onPause = null;

  function init(keysRef, onStartCb, onPauseCb) {
    _keys  = keysRef;
    _onStart = onStartCb;
    _onPause = onPauseCb;
  }

  function _btn(gp, idx) {
    const b = gp.buttons[idx];
    return b ? (b.pressed || b.value > 0.5) : false;
  }

  function poll() {
    if (!_keys) return;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    // Clear previous gamepad state
    _keys.left  = _keys.left  && !_keys.__gpLeft;
    _keys.right = _keys.right && !_keys.__gpRight;
    _keys.jump  = _keys.jump  && !_keys.__gpJump;
    _keys.shoot = _keys.shoot && !_keys.__gpShoot;
    _keys.dash  = _keys.dash  && !_keys.__gpDash;

    _keys.__gpLeft  = false;
    _keys.__gpRight = false;
    _keys.__gpJump  = false;
    _keys.__gpShoot = false;
    _keys.__gpDash  = false;

    for (const gp of gamepads) {
      if (!gp || !gp.connected) continue;

      const left  = _btn(gp, BTN.LEFT)  || (gp.axes[0] < -AXIS_THRESHOLD);
      const right = _btn(gp, BTN.RIGHT) || (gp.axes[0] >  AXIS_THRESHOLD);
      const jump  = _btn(gp, BTN.A)     || _btn(gp, BTN.UP);
      const shoot = _btn(gp, BTN.X)     || _btn(gp, BTN.RB);
      const dash  = _btn(gp, BTN.B)     || _btn(gp, BTN.LB);
      const start = _btn(gp, BTN.START);
      const sel   = _btn(gp, BTN.SELECT);

      if (left)  { _keys.left  = true; _keys.__gpLeft  = true; }
      if (right) { _keys.right = true; _keys.__gpRight = true; }
      if (jump)  { _keys.jump  = true; _keys.__gpJump  = true; }
      if (shoot) { _keys.shoot = true; _keys.__gpShoot = true; }
      if (dash)  { _keys.dash  = true; _keys.__gpDash  = true; }

      if (start && !gp.__startWas) _onPause && _onPause();
      if (sel   && !gp.__selWas)   _onStart && _onStart();
      gp.__startWas = start;
      gp.__selWas   = sel;
    }
  }

  // Show a small "gamepad connected" toast when a controller is plugged in
  window.addEventListener('gamepadconnected', (e) => {
    console.log('[KidGame] Gamepad connected:', e.gamepad.id);
    const toast = document.getElementById('gpToast');
    if (toast) {
      toast.textContent = '🎮 Controller connected!';
      toast.style.opacity = '1';
      setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    }
  });

  window.addEventListener('gamepaddisconnected', (e) => {
    console.log('[KidGame] Gamepad disconnected:', e.gamepad.id);
  });

  return { init, poll };
})();
