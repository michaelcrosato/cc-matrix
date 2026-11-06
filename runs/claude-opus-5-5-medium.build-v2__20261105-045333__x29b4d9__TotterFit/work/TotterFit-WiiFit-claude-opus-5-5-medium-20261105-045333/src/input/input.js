// All three devices, polled inside the fixed tick. Presses are latched so quick taps never vanish.
const clampDisc = (x, z) => { const m = Math.hypot(x, z); return m > 1 ? [x / m, z / m] : [x, z]; };
export function normKey(e) {
  let c = e.code || e.key || '';
  if (/^Key[A-Z]$/.test(c)) return c[3].toLowerCase();
  if (/^[a-zA-Z]$/.test(c)) return c.toLowerCase();
  if (c === ' ' || c === 'Spacebar') return 'space';
  if (c === 'Space') return 'space';
  if (c === 'ShiftLeft' || c === 'ShiftRight' || c === 'Shift') return 'shift';
  if (c === 'NumpadEnter') return 'enter';
  return c.toLowerCase();
}
const WEIGHT = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0], arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0] };
const blankC = (device, index) => ({ device, index, x: 0, z: 0, walkX: 0, walkZ: 0, moveX: 0, moveZ: 0, lf: 0, rf: 0, hop: false, hopHeld: false, flail: false, breath: false, ask: false, use: false, pause: false, back: false, lookX: 0, lookY: 0, tapA: false, tapD: false, connected: false, keysDown: false, more: false });
export class Input {
  constructor() {
    this.keys = new Set(); this.latch = new Set(); this.mouse = 0; this.mouseLatch = 0; this.px = innerWidth / 2; this.py = innerHeight / 2;
    this.pointerActive = false; this.ringX = 0; this.ringZ = 0; this.lfK = 0; this.rfK = 0; this.lastDevice = 'kbm'; this.lastPad = 0;
    this.kbm = blankC('kbm', 0); this.pads = [0, 1, 2, 3].map(i => blankC('pad', i)); this.merged = blankC('merged', 0);
    this.prev = [0, 1, 2, 3].map(() => []); this.prevAxes = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
    this.menu = { up: false, down: false, left: false, right: false, confirm: false, back: false, more: false };
    this.rep = { up: 0, down: 0, left: 0, right: 0 }; this.anyInput = false; this.mouseMoved = 0; this.wheel = 0; this.lookDX = 0; this.lookDY = 0;
    this.onDevice = null; this.onGesture = null; this.hoverMoved = false; this.chordWas = false; this.padSeen = false;
    this.lastMoveX = null; this.lastMoveY = null; this.rightClickBack = false; this.touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
    this.lastTouch = false;
    addEventListener('keydown', (e) => {
      if (e.repeat) { if (this.isGameKey(e)) e.preventDefault(); return; }
      const k = normKey(e); this.keys.add(k); this.latch.add(k); this.anyInput = true; this.setDevice('kbm'); this.gesture();
      if (this.isGameKey(e)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys.delete(normKey(e)); });
    addEventListener('blur', () => { this.keys.clear(); this.mouse = 0; });
    const btn = (e) => { this.mouse = e.buttons; this.mouseLatch |= e.buttons; };
    addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { this.anyInput = true; this.lastTouch = true; return; } btn(e); this.anyInput = true; this.setDevice('kbm'); this.gesture(); });
    addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') btn(e); });
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const moved = this.lastMoveX === null ? 0 : Math.hypot(e.clientX - this.lastMoveX, e.clientY - this.lastMoveY);
      if (this.lastMoveX !== null && (e.clientX !== this.lastMoveX || e.clientY !== this.lastMoveY)) this.hoverMoved = true;
      if (this.mouse & 2) { this.lookDX += e.clientX - this.px; this.lookDY += e.clientY - this.py; }
      this.px = e.clientX; this.py = e.clientY; this.lastMoveX = e.clientX; this.lastMoveY = e.clientY;
      this.mouse = e.buttons; this.mouseLatch |= e.buttons;
      this.mouseMoved += moved;
      if (this.mouseMoved >= 4) { this.setDevice('kbm'); this.pointerActive = true; }
      if (this.mouseMoved > 8) this.anyInput = true;
    });
    addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    addEventListener('contextmenu', (e) => { e.preventDefault(); });
    addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
  }
  isGameKey(e) { const k = normKey(e); return k === 'space' || k.startsWith('arrow') || k === 'tab' || k === 'backspace'; }
  gesture() { if (this.onGesture) this.onGesture(); }
  setDevice(d) { if (this.lastDevice !== d) { this.lastDevice = d; if (this.onDevice) this.onDevice(d); } }
  /** Clear what's latched: the press that exited attract mode doesn't act on anything. */
  swallow() { this.latch.clear(); this.mouseLatch = 0; this.anyInput = false; this.mouseMoved = 0; for (const c of [this.kbm, this.merged, ...this.pads]) { c.hop = c.flail = c.ask = c.use = c.pause = c.back = c.tapA = c.tapD = c.more = false; } this.menu.up = this.menu.down = this.menu.left = this.menu.right = this.menu.confirm = this.menu.back = this.menu.more = false; this.chordWas = (this.mouse & 3) === 3; this.swallowT = .15; }
  poll(dt) {
    const pressed = (k) => this.latch.has(k);
    const down = (k) => this.keys.has(k) || this.latch.has(k);
    // Keyboard and mouse
    const K = this.kbm; K.connected = true;
    let kx = 0, kz = 0, keyHeld = false;
    for (const k in WEIGHT) if (this.keys.has(k) || this.latch.has(k)) { kx += WEIGHT[k][0]; kz += WEIGHT[k][1]; keyHeld = true; }
    const dirM = Math.hypot(kx, kz) || 1; K.walkX = kx / dirM; K.walkZ = kz / dirM;
    if (keyHeld) {
      if (this.pointerActive) { this.pointerActive = false; const pt = this.pointerWish(); this.ringX = pt[0]; this.ringZ = pt[1]; }
      this.ringX += kx / dirM * 1.6 * dt; this.ringZ += kz / dirM * 1.6 * dt;
      [this.ringX, this.ringZ] = clampDisc(this.ringX, this.ringZ);
    }
    if (pressed('c')) { this.ringX = 0; this.ringZ = 0; this.pointerActive = false; }
    if (this.pointerActive) { const p = this.pointerWish(); K.x = p[0]; K.z = p[1]; K.moveX = keyHeld ? K.walkX : p[0]; K.moveZ = keyHeld ? K.walkZ : p[1]; }
    else { K.x = this.ringX; K.z = this.ringZ; K.moveX = K.walkX; K.moveZ = K.walkZ; }
    K.keysDown = keyHeld;
    const mb = this.mouse | this.mouseLatch;
    this.lfK = Math.max(0, Math.min(1, this.lfK + ((down('q') || (mb & 1)) ? dt / .12 : -dt / .12)));
    this.rfK = Math.max(0, Math.min(1, this.rfK + ((down('e') || (mb & 2)) ? dt / .12 : -dt / .12)));
    // A press counts at once, however short: the ramp is only for how far the foot goes.
    if (pressed('q') || ((this.mouseLatch & 1) && !(this.prevMouse & 1))) this.lfK = Math.max(this.lfK, .6);
    if (pressed('e') || ((this.mouseLatch & 2) && !(this.prevMouse & 2))) this.rfK = Math.max(this.rfK, .6);
    K.lf = this.lfK; K.rf = this.rfK;
    const chord = (mb & 3) === 3;
    K.hop = pressed('space') || (chord && !this.chordWas); this.chordWas = (this.mouse & 3) === 3;
    K.hopHeld = this.keys.has('space') || (this.mouse & 3) === 3;
    K.flail = pressed('f') || !!(this.mouseLatch & 4 && !(this.prevMouse & 4));
    K.breath = this.keys.has('shift');
    K.ask = pressed('t'); K.use = pressed('enter') || pressed('e');
    K.pause = pressed('escape'); K.back = pressed('escape') || pressed('backspace'); K.more = pressed('m');
    K.tapA = pressed('a') || pressed('arrowleft'); K.tapD = pressed('d') || pressed('arrowright');
    K.lookX = (this.mouse & 2) ? this.lookDX * .004 : 0; K.lookY = (this.mouse & 2) ? this.lookDY * .004 : 0; this.lookDX = 0; this.lookDY = 0;
    this.prevMouse = this.mouse;
    // Pads
    let list = []; try { list = navigator.getGamepads ? navigator.getGamepads() : []; } catch { list = []; }
    const M = this.menu; const dp = { up: false, down: false, left: false, right: false };
    let mConfirm = pressed('enter') || pressed('space'), mBack = K.back, mMore = pressed('m');
    let anyStickY = 0, anyStickX = 0;
    for (let i = 0; i < 4; i++) {
      const c = this.pads[i], p = list[i] || null, was = c.connected;
      c.connected = !!(p && p.connected);
      if (!c.connected) { if (was) this.disconnected = i; c.x = c.z = c.lf = c.rf = 0; c.hop = c.flail = c.use = c.pause = c.back = c.ask = false; continue; }
      if (p.mapping && p.mapping !== 'standard') { c.connected = true; }
      const prev = this.prev[i]; const B = (n) => { const b = p.buttons[n]; return b ? (typeof b === 'object' ? b.pressed : b === 1) : false; }; const V = (n) => { const b = p.buttons[n]; return b ? (typeof b === 'object' ? (b.value ?? (b.pressed ? 1 : 0)) : b) : 0; };
      const E = (n) => { const on = B(n), w = prev[n]; return on && !w; };
      const dz = (v) => Math.abs(v) < .08 ? 0 : v;
      const ax = dz(p.axes[0] || 0), az = dz(p.axes[1] || 0);
      [c.x, c.z] = clampDisc(ax, az); c.walkX = c.moveX = c.x; c.walkZ = c.moveZ = c.z;
      c.lookX = dz(p.axes[2] || 0) * 2.2 * dt; c.lookY = dz(p.axes[3] || 0) * 1.6 * dt;
      c.lf = V(6); c.rf = V(7);
      const create = B(8);
      c.hop = E(0); c.hopHeld = B(0); c.use = E(0); c.flail = E(2); c.breath = B(5); c.ask = E(3); c.back = E(1); c.more = E(3);
      c.pause = E(9) && !create; c.tapA = false; c.tapD = false;
      const anyBtn = p.buttons.some((b, n) => (typeof b === 'object' ? b.pressed : b === 1) && !prev[n]);
      const sticks = Math.max(Math.abs(p.axes[0] || 0), Math.abs(p.axes[1] || 0), Math.abs(p.axes[2] || 0), Math.abs(p.axes[3] || 0));
      if (anyBtn || sticks > .25) { this.lastPad = i; this.setDevice('pad'); this.padSeen = true; }
      if (anyBtn || sticks > .3) this.anyInput = true;
      if (anyBtn) { this.gesture(); this.padGestureAt ??= performance.now(); }
      if (B(12)) dp.up = true; if (B(13)) dp.down = true; if (B(14)) dp.left = true; if (B(15)) dp.right = true;
      if (Math.abs(p.axes[1] || 0) > Math.abs(anyStickY)) anyStickY = p.axes[1] || 0;
      if (Math.abs(p.axes[0] || 0) > Math.abs(anyStickX)) anyStickX = p.axes[0] || 0;
      if (E(0)) mConfirm = true; if (E(1)) mBack = true; if (E(3)) mMore = true;
      for (let n = 0; n < p.buttons.length; n++) prev[n] = B(n);
    }
    // Merged controller: analog follows the last device, edges come from anywhere.
    const m = this.merged, a = this.lastDevice === 'pad' ? this.pads[this.lastPad] : K;
    for (const key of ['x', 'z', 'walkX', 'walkZ', 'moveX', 'moveZ', 'lf', 'rf', 'lookX', 'lookY']) m[key] = a[key];
    m.keysDown = a.keysDown; m.tapA = K.tapA; m.tapD = K.tapD; m.activeDevice = a.device;
    const any = (key) => K[key] || this.pads.some(p => p.connected && p[key]);
    for (const key of ['hop', 'flail', 'ask', 'use', 'pause', 'back', 'more']) m[key] = any(key);
    m.hopHeld = K.hopHeld || this.pads.some(p => p.connected && p.hopHeld);
    m.breath = K.breath || this.pads.some(p => p.connected && p.breath);
    // Menu edges with repeat
    const held = {
      up: dp.up || anyStickY < -.5 || this.keys.has('arrowup') || this.keys.has('w') || pressed('arrowup') || pressed('w'),
      down: dp.down || anyStickY > .5 || this.keys.has('arrowdown') || this.keys.has('s') || pressed('arrowdown') || pressed('s'),
      left: dp.left || anyStickX < -.5 || this.keys.has('arrowleft') || this.keys.has('a') || pressed('arrowleft') || pressed('a'),
      right: dp.right || anyStickX > .5 || this.keys.has('arrowright') || this.keys.has('d') || pressed('arrowright') || pressed('d'),
    };
    for (const d in held) {
      if (!held[d]) { M[d] = false; this.rep[d] = 0; continue; }
      if (!this.rep[d]) { M[d] = true; this.rep[d] = .38; continue; }
      this.rep[d] -= dt; M[d] = false;
      if (this.rep[d] <= 0) { M[d] = true; this.rep[d] = .14; }
    }
    M.confirm = mConfirm; M.back = mBack; M.more = mMore;
    if (this.swallowT > 0) { this.swallowT -= dt; M.confirm = M.back = M.up = M.down = M.left = M.right = M.more = false; }
    this.latch.clear(); this.mouseLatch = 0;
    if (this.mouseMoved > 0) this.mouseMoved = Math.max(0, this.mouseMoved - dt * 40);
  }
  pointerWish() { const h = Math.max(1, innerHeight); return clampDisc((this.px - innerWidth / 2) / (h * .33), (this.py - innerHeight / 2) / (h * .33)); }
  takeWheel() { const w = this.wheel; this.wheel = 0; return w; }
  /** A stick resting should never fight a resting mouse: returns the controller for a solo lane. */
  controllerFor(spec) { if (!spec || spec === 'merged') return this.merged; if (spec === 'kbm') return this.kbm; return this.pads[spec]; }
}
