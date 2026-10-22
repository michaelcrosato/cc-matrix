// ===== 01_input: unified controller-first input (Gamepad API primary, keyboard/mouse mapped onto it) =====
const KEYMAP = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  fire: ['Space', 'KeyJ'], bomb: ['KeyK', 'KeyX'], boost: ['ShiftLeft', 'ShiftRight'],
  brake: ['ControlLeft', 'ControlRight', 'KeyC'], rollL: ['KeyQ'], rollR: ['KeyE'],
  confirm: ['Enter', 'Space', 'KeyJ'], back: ['Escape', 'Backspace'], pause: ['Escape', 'KeyP'], skip: ['Tab'],
};
const PADMAP = {
  fire: [0], bomb: [1, 2], boost: [7], brake: [6], rollL: [4], rollR: [5],
  confirm: [0], back: [1], pause: [9], up: [12], down: [13], left: [14], right: [15], skip: [3],
};
const GLYPHS = {
  ps: { confirm: '✕', back: '○', fire: '✕', bomb: '○', boost: 'R2', brake: 'L2', roll: 'L1 / R1', pause: 'OPTIONS', move: 'Left Stick', skip: '△', rollL: 'L1', rollR: 'R1' },
  xbox: { confirm: 'A', back: 'B', fire: 'A', bomb: 'B', boost: 'RT', brake: 'LT', roll: 'LB / RB', pause: 'MENU', move: 'Left Stick', skip: 'Y', rollL: 'LB', rollR: 'RB' },
  kb: { confirm: 'Enter', back: 'Esc', fire: 'Space', bomb: 'K', boost: 'Shift', brake: 'Ctrl', roll: 'Q / E', pause: 'Esc', move: 'WASD / Arrows', skip: 'Tab', rollL: 'Q', rollR: 'E' },
};

const Input = {
  keys: new Set(),
  mouseBtn: [false, false, false],
  h: new Set(), prevH: new Set(),
  move: { x: 0, y: 0 },        // y positive = up
  rawStick: { x: 0, y: 0 },
  device: 'kb',                // 'kb' | 'ps' | 'xbox'
  padConnected: false,
  padId: '',
  lastActivity: performance.now(),
  activity: false,             // any "real" input since last frame
  anyKeyboard: false,
  navHold: {}, navFire: new Set(),
  tapTime: { '-1': -9, '1': -9 }, tapPrevSide: 0,
  rollQueue: 0,                // -1 left, 1 right, 0 none (consumed by gameplay)
  boostAxis: 0, brakeAxis: 0,
  pad: null,

  init() {
    addEventListener('keydown', (e) => {
      if (e.repeat) { if (this.isGameKey(e.code)) e.preventDefault(); return; }
      this.keys.add(e.code); this.anyKeyboard = true; this.device = this.device === 'kb' ? 'kb' : 'kb';
      this.markActivity();
      if (this.isGameKey(e.code)) e.preventDefault();
      Sfx.resume();
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => { this.keys.clear(); this.mouseBtn = [false, false, false]; });
    addEventListener('mousedown', (e) => { this.mouseBtn[e.button] = true; this.markActivity(); Sfx.resume(); });
    addEventListener('mouseup', (e) => { this.mouseBtn[e.button] = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    let lx = 0, ly = 0;
    addEventListener('mousemove', (e) => { if (Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly) > 6) { this.markActivity(); } lx = e.clientX; ly = e.clientY; });
    addEventListener('wheel', () => this.markActivity(), { passive: true });
    addEventListener('touchstart', () => { this.markActivity(); }, { passive: true });
    addEventListener('gamepadconnected', (e) => { this.padConnected = true; this.setPadDevice(e.gamepad); this.markActivity(); });
    addEventListener('gamepaddisconnected', () => { this.padConnected = false; });
  },
  isGameKey(c) { return /^(Arrow|Space|Tab|Enter|Escape)/.test(c) || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(c); },
  markActivity() { this.activity = true; this.lastActivity = performance.now(); },
  setPadDevice(p) {
    this.padId = p.id || '';
    this.device = /xbox|xinput|microsoft/i.test(this.padId) ? 'xbox' : 'ps';
  },
  dz(v) {
    const d = S().deadzone;
    const a = Math.abs(v);
    if (a < d) return 0;
    return Math.sign(v) * (a - d) / (1 - d);
  },

  // Called once per frame, before the game update.
  poll(dt) {
    this.prevH = this.h;
    const h = new Set();
    // --- gamepad
    let pad = null;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) { if (p && p.connected) { pad = p; break; } }
    this.pad = pad;
    let sx = 0, sy = 0, dpadX = 0, dpadY = 0;
    if (pad) {
      if (!this.padConnected) { this.padConnected = true; this.setPadDevice(pad); }
      const b = pad.buttons;
      for (const act in PADMAP) {
        for (const i of PADMAP[act]) { if (b[i] && (b[i].pressed || b[i].value > 0.4)) { h.add(act); } }
      }
      this.boostAxis = b[7] ? b[7].value : 0; this.brakeAxis = b[6] ? b[6].value : 0;
      sx = this.dz(pad.axes[0] || 0); sy = this.dz(pad.axes[1] || 0);
      // radial deadzone on the pair
      const mag = Math.hypot(pad.axes[0] || 0, pad.axes[1] || 0);
      if (mag < S().deadzone) { sx = 0; sy = 0; }
      // Settings: the intermittent inverted-stick workaround
      if (S().invertH) sx = -sx;
      if (S().invertV) sy = -sy;
      sy = -sy; // pad axis down is +; make up positive
      if (h.has('left')) dpadX -= 1; if (h.has('right')) dpadX += 1;
      if (h.has('up')) dpadY += 1; if (h.has('down')) dpadY -= 1;
      // activity detection
      let act = false;
      for (let i = 0; i < b.length; i++) if (b[i].pressed) act = true;
      if (Math.abs(pad.axes[0]) > 0.5 || Math.abs(pad.axes[1]) > 0.5) act = true;
      if (act) { this.markActivity(); this.setPadDevice(pad); Sfx.resume(); }
    } else { this.boostAxis = 0; this.brakeAxis = 0; }
    this.rawStick.x = sx; this.rawStick.y = sy;

    // --- keyboard / mouse
    let kx = 0, ky = 0;
    for (const act in KEYMAP) {
      for (const c of KEYMAP[act]) if (this.keys.has(c)) h.add(act);
    }
    if (this.mouseBtn[0]) h.add('fire');
    if (this.mouseBtn[2]) h.add('bomb');
    if (this.keys.has(KEYMAP.left[0]) || this.keys.has(KEYMAP.left[1])) kx -= 1;
    if (this.keys.has(KEYMAP.right[0]) || this.keys.has(KEYMAP.right[1])) kx += 1;
    if (this.keys.has(KEYMAP.up[0]) || this.keys.has(KEYMAP.up[1])) ky += 1;
    if (this.keys.has(KEYMAP.down[0]) || this.keys.has(KEYMAP.down[1])) ky -= 1;
    if (this.keys.size && !pad) this.device = 'kb';
    else if (this.keys.size && this.activityKeyboardRecent()) this.device = 'kb';

    let mx = clamp(sx + dpadX + kx, -1, 1), my = clamp(sy + dpadY + ky, -1, 1);
    if (this.boostAxis > 0.4) h.add('boost');
    if (this.brakeAxis > 0.4) h.add('brake');
    this.move.x = mx; this.move.y = my;
    this.h = h;

    // --- double-tap roll detection (stick or keys)
    const now = performance.now() / 1000;
    const side = mx > 0.85 ? 1 : mx < -0.85 ? -1 : 0;
    if (side !== 0 && side !== this.tapPrevSide) {
      if (now - this.tapTime[side] < 0.28) { this.rollQueue = side; this.tapTime[side] = -9; } else this.tapTime[side] = now;
    }
    this.tapPrevSide = side;
    if (this.pressed('rollL')) this.rollQueue = -1;
    if (this.pressed('rollR')) this.rollQueue = 1;

    // --- menu navigation with auto-repeat (stick, d-pad, keys)
    this.navFire.clear();
    const dirs = {
      up: h.has('up') || sy > 0.6, down: h.has('down') || sy < -0.6,
      left: h.has('left') || sx < -0.6, right: h.has('right') || sx > 0.6,
    };
    for (const d in dirs) {
      if (dirs[d]) {
        const st = this.navHold[d];
        if (st === undefined) { this.navHold[d] = 0.42; this.navFire.add(d); }
        else { this.navHold[d] = st - dt; if (this.navHold[d] <= 0) { this.navHold[d] = 0.09; this.navFire.add(d); } }
      } else delete this.navHold[d];
    }
  },
  activityKeyboardRecent() { return performance.now() - this.lastActivity < 3000; },
  held(a) { return this.h.has(a); },
  pressed(a) { return this.h.has(a) && !this.prevH.has(a); },
  released(a) { return !this.h.has(a) && this.prevH.has(a); },
  nav(d) { return this.navFire.has(d); },
  consumeRoll() { const r = this.rollQueue; this.rollQueue = 0; return r; },
  consumeActivity() { const a = this.activity; this.activity = false; return a; },
  idleSeconds() { return (performance.now() - this.lastActivity) / 1000; },
  glyph(a) { return (GLYPHS[this.device] || GLYPHS.kb)[a] || a; },
  rumble(strong, weak, ms) {
    if (!S().rumble || !this.pad) return;
    const act = this.pad.vibrationActuator;
    if (!act || !act.playEffect) return;
    try { act.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }); } catch (e) { /* unsupported */ }
  },
  hasController() { return !!this.pad; },
};
