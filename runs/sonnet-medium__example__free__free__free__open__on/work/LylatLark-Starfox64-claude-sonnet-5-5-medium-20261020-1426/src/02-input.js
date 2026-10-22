'use strict';
/* ===== Input: gamepad first (DualSense layout), keyboard + mouse mirror it ===== */
const ACTIONS = ['fire', 'bomb', 'rollL', 'rollR', 'boost', 'brake', 'squad', 'pause', 'confirm', 'back', 'up', 'down', 'left', 'right', 'tabL', 'tabR'];
const KEYMAP = {
  fire: ['Space', 'KeyJ'], bomb: ['KeyK', 'KeyX'], rollL: ['KeyQ'], rollR: ['KeyE'], boost: ['ShiftLeft', 'ShiftRight'],
  brake: ['ControlLeft', 'ControlRight', 'KeyC'], squad: ['KeyR', 'KeyL'], pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'Space', 'NumpadEnter'], back: ['Backspace', 'Escape'],
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  tabL: ['KeyZ', 'PageUp'], tabR: ['KeyV', 'PageDown'],
};
/* standard-mapping button index per action (PS5: 0 ✕, 1 ○, 2 □, 3 △, 4 L1, 5 R1, 6 L2, 7 R2, 9 Options) */
const PADMAP = {
  fire: [0, 2], bomb: [1], rollL: [4], rollR: [5], boost: [7], brake: [6], squad: [3], pause: [9, 8],
  confirm: [0], back: [1], up: [12], down: [13], left: [14], right: [15], tabL: [4], tabR: [5],
};
const GLYPH_PAD = {
  fire: '✕', bomb: '○', rollL: 'L1', rollR: 'R1', boost: 'R2', brake: 'L2', squad: '△', pause: 'OPTIONS',
  confirm: '✕', back: '○', move: 'L-STICK', tabL: 'L1', tabR: 'R1',
};
const GLYPH_KB = {
  fire: 'SPACE', bomb: 'K', rollL: 'Q', rollR: 'E', boost: 'SHIFT', brake: 'CTRL', squad: 'R', pause: 'ESC',
  confirm: 'ENTER', back: 'BACKSPACE', move: 'WASD', tabL: 'Z', tabR: 'V',
};
const Input = {
  keys: new Set(), latched: new Set(), down: {}, prev: {}, pressed: {}, released: {}, nav: {},
  navT: {}, last: 'kb', padConnected: false, padId: '', activity: false, anyPressed: false,
  mx: 0, my: 0, rawX: 0, rawY: 0, mouseMoved: false, keyboardUsed: false, touchSeen: false,
  _rumbleUntil: 0,
  init() {
    for (const a of ACTIONS) { this.down[a] = this.prev[a] = this.pressed[a] = this.released[a] = this.nav[a] = false; this.navT[a] = 0; }
    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code); this.latched.add(e.code); this.last = 'kb'; this.activity = true; this.keyboardUsed = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousedown', () => { this.activity = true; });
    addEventListener('touchstart', () => { this.touchSeen = true; }, { passive: true });
    addEventListener('gamepadconnected', (e) => { this.padConnected = true; this.padId = e.gamepad.id; this.last = 'pad'; });
    addEventListener('gamepaddisconnected', () => { this.padConnected = false; });
  },
  getPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let best = null;
    for (const p of pads) { if (p && p.connected && (!best || /wireless|dualsense|054c/i.test(p.id))) best = p; }
    return best;
  },
  isXbox() { return /xbox|045e/i.test(this.padId) && !/054c/i.test(this.padId); },
  glyph(action) {
    if (this.last === 'pad') {
      if (this.isXbox()) return ({ fire: 'A', bomb: 'B', squad: 'Y', confirm: 'A', back: 'B', pause: 'MENU', rollL: 'LB', rollR: 'RB', boost: 'RT', brake: 'LT', move: 'L-STICK', tabL: 'LB', tabR: 'RB' })[action] || '?';
      return GLYPH_PAD[action] || '?';
    }
    return GLYPH_KB[action] || '?';
  },
  poll(dt) {
    const pad = this.getPad();
    this.padConnected = !!pad;
    if (pad) this.padId = pad.id;
    let ax = 0, ay = 0, padActive = false;
    const d = {};
    for (const a of ACTIONS) {
      let on = false;
      for (const c of KEYMAP[a]) if (this.keys.has(c) || this.latched.has(c)) on = true;
      if (on) this.last = 'kb';
      d[a] = on;
    }
    let kx = (d.right ? 1 : 0) - (d.left ? 1 : 0), ky = (d.up ? 1 : 0) - (d.down ? 1 : 0);
    let anyBtn = false;
    if (pad) {
      for (const a of ACTIONS) {
        for (const b of PADMAP[a]) {
          const btn = pad.buttons[b];
          if (btn && (btn.pressed || btn.value > 0.5)) { d[a] = true; padActive = true; }
        }
      }
      for (let i = 0; i < pad.buttons.length; i++) if (pad.buttons[i].pressed) anyBtn = true;
      const dz = Settings.deadzone;
      let x = pad.axes[0] || 0, y = -(pad.axes[1] || 0);
      const m = Math.hypot(x, y);
      if (m < dz) { x = 0; y = 0; } else { const k = (m - dz) / (1 - dz) / m; x *= k; y *= k; }
      this.rawX = x; this.rawY = y;
      if (Math.abs(pad.axes[0]) > 0.55 || Math.abs(pad.axes[1]) > 0.55) padActive = true;
      if (Math.abs(x) > 0 || Math.abs(y) > 0) padActive = true;
      ax = x * (Settings.invertX ? -1 : 1); ay = y * (Settings.invertY ? -1 : 1);
      // stick drives menu navigation (raw, not inverted)
      if (y > 0.6) d.up = true; if (y < -0.6) d.down = true; if (x > 0.6) d.right = true; if (x < -0.6) d.left = true;
      if (padActive) this.last = 'pad';
    }
    if (anyBtn || (pad && (Math.abs(pad.axes[0]) > 0.6 || Math.abs(pad.axes[1]) > 0.6))) this.activity = true;
    this.mx = clamp(ax + kx, -1, 1); this.my = clamp(ay + ky, -1, 1);
    if (!pad) { this.rawX = kx; this.rawY = ky; }
    for (const a of ACTIONS) {
      this.prev[a] = this.down[a]; this.down[a] = d[a];
      this.pressed[a] = d[a] && !this.prev[a]; this.released[a] = !d[a] && this.prev[a];
      if (this.pressed[a] && this.keyboardUsed === false && this.last === 'kb') this.keyboardUsed = true;
      // menu nav with auto-repeat for directions
      if (a === 'up' || a === 'down' || a === 'left' || a === 'right') {
        this.nav[a] = false;
        if (d[a]) {
          if (this.pressed[a]) { this.nav[a] = true; this.navT[a] = 0.38; }
          else { this.navT[a] -= dt; if (this.navT[a] <= 0) { this.nav[a] = true; this.navT[a] = 0.09; } }
        }
      } else this.nav[a] = this.pressed[a];
    }
  },
  /** one frame has been consumed by whoever cared about activity */
  clearActivity() { this.activity = false; this.latched.clear(); },
  rumble(strong, weak, ms) {
    if (!Settings.rumble) return;
    const pad = this.getPad();
    const act = pad && pad.vibrationActuator;
    if (!act || !act.playEffect) return;
    const now = performance.now();
    if (now < this._rumbleUntil - 20) return;
    this._rumbleUntil = now + ms;
    try { act.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: clamp(strong * Settings.rumble, 0, 1), weakMagnitude: clamp(weak * Settings.rumble, 0, 1) }).catch(() => {}); } catch (e) { /* unsupported */ }
  },
};
