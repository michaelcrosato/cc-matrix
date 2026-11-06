// Pads, keys and mouse, polled inside the fixed tick. Presses are latched so a quick tap between
// two polls still counts. Weight comes from whichever device was used last.
export const BTN = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, create: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };

export function normKey(e) {
  let c = String(e.code || e.key || '').toLowerCase();
  if (!c) return '';
  if (c.startsWith('key') && c.length === 4) c = c.slice(3);
  else if (c.startsWith('digit')) c = c.slice(5);
  if (c === ' ' || c === 'spacebar') c = 'space';
  if (c === 'shiftleft' || c === 'shiftright') c = 'shift';
  if (c === 'numpadenter') c = 'enter';
  if (c === 'return') c = 'enter';
  if (c === 'esc') c = 'escape';
  if (c === 'up' || c === 'down' || c === 'left' || c === 'right') c = `arrow${c}`;
  return c;
}

const WEIGHT_KEYS = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };
export const DEAD = 0.08;

class PadState {
  constructor(index) {
    this.index = index; this.connected = false;
    this.axes = [0, 0, 0, 0]; this.val = new Array(17).fill(0); this.held = new Array(17).fill(false); this.edge = new Array(17).fill(false);
    this.up = new Array(17).fill(false);
    this.rawActuator = null;
    this.moveHeld = { up: 0, down: 0, left: 0, right: 0 };
    this.blocked = false;
  }
}

function radial(x, y) {
  const m = Math.hypot(x, y);
  if (m < DEAD) return [0, 0];
  const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
  return [x * k, y * k];
}

export class Input {
  constructor() {
    this.down = new Set(); this.pressed = new Set(); this.released = new Set();
    this.buttons = 0; this.btnLatch = 0; this.btnEdge = 0; this.bothWas = false; this.bothEdge = false;
    this.mx = 0; this.my = 0; this.moved = false; this.pointerActive = false; this.travel = 0; this.travelT = 0; this.wheel = 0;
    this.lastHoverX = -1; this.lastHoverY = -1;
    this.ringX = 0; this.ringZ = 0;
    this.footLRamp = 0; this.footRRamp = 0;
    this.pads = [new PadState(0), new PadState(1), new PadState(2), new PadState(3)];
    this.activePad = 0;
    this.lastDevice = 'kbm'; this.anyPadSeen = false;
    this.verbs = new Set();
    this.idle = 0; this.activity = false;
    this.blocked = false; this.lostPads = [];
    this.onGesture = null; this.rumbleOn = true; this.lastRumble = null; this.keyMoveT = {};
    this.dragX = 0; this.dragY = 0;
    this.clickQueue = [];
    this.touchOnly = false;
    this.w = 1920; this.h = 1080;
  }
  attach(t = window) {
    t.addEventListener('keydown', (e) => {
      const k = normKey(e);
      if (!k) return;
      if (['space', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab', 'backspace'].includes(k)) e.preventDefault();
      if (!e.repeat) { this.pressed.add(k); this.activity = true; this._gesture(); }
      if (!e.repeat || !this.down.has(k)) this.down.add(k);
      if (!e.repeat) this._kbm();
    });
    t.addEventListener('keyup', (e) => { const k = normKey(e); if (k) { this.down.delete(k); this.released.add(k); } });
    t.addEventListener('blur', () => { this.down.clear(); this.buttons = 0; });
    const pointer = (e) => {
      if (e.pointerType === 'touch') return;
      const nb = e.buttons | 0;
      const rising = nb & ~this.buttons;
      if (rising) { this.btnLatch |= rising; this.activity = true; this._kbm(); this._gesture(); }
      this.buttons = nb;
    };
    t.addEventListener('pointerdown', pointer);
    t.addEventListener('pointerup', pointer);
    t.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      pointer(e);
      const dx = e.clientX - this.mx, dy = e.clientY - this.my;
      if (dx === 0 && dy === 0) return;
      this.mx = e.clientX; this.my = e.clientY;
      const d = Math.hypot(dx, dy);
      this.travel += d;
      if (this.buttons & 2) { this.dragX += dx; this.dragY += dy; }
      this.moved = true;
      this.pointerActive = true;
      if (d >= 4) this._kbm();
    });
    t.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    t.addEventListener('contextmenu', (e) => e.preventDefault());
    t.addEventListener('touchstart', () => { this.activity = true; this._gesture(); }, { passive: true });
    t.addEventListener('gamepadconnected', () => { this.anyPadSeen = true; });
  }
  _kbm() { this.lastDevice = 'kbm'; }
  _gesture() { if (this.onGesture) this.onGesture(); }
  /** Drop everything held or latched until it is released: the exit press never acts. */
  swallow() {
    this.pressed.clear(); this.btnLatch = 0; this.btnEdge = 0; this.bothEdge = false; this.verbs.clear();
    this.blocked = true; this.clickQueue = [];
    for (const p of this.pads) p.blocked = p.connected;
  }
  resetRing() { this.ringX = 0; this.ringZ = 0; this.pointerActive = false; }
  rumble(strong, weak, ms, pad = this.activePad) {
    this.lastRumble = { strong, weak, ms };
    if (!this.rumbleOn) return;
    const a = this.pads[pad] && this.pads[pad].rawActuator;
    if (a && a.playEffect) {
      try { const r = a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* a pad that refuses to rumble is still a pad */ }
    }
  }
  poll(dt) {
    this.w = (typeof window !== 'undefined' && window.innerWidth) || 1920;
    this.h = (typeof window !== 'undefined' && window.innerHeight) || 1080;
    const verbs = this.verbs;
    verbs.clear();
    this.activity = this.activity || false;
    // Pads
    let list = [];
    try { list = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { list = []; }
    for (let i = 0; i < 4; i++) {
      const raw = list && list[i];
      const st = this.pads[i];
      if (raw && raw.connected !== false) {
        if (!st.connected) { st.connected = true; this.anyPadSeen = true; }
        st.rawActuator = raw.vibrationActuator || null;
        for (let a = 0; a < 4; a++) st.axes[a] = raw.axes && raw.axes[a] ? raw.axes[a] : 0;
        let anyHeld = false;
        for (let b = 0; b < 17; b++) {
          const btn = raw.buttons && raw.buttons[b];
          const value = btn ? (typeof btn === 'number' ? btn : (btn.value || (btn.pressed ? 1 : 0))) : 0;
          const held = (b === 6 || b === 7) ? (st.held[b] ? value > 0.35 : value > 0.5) : (btn ? (btn.pressed === undefined ? value > 0.5 : !!btn.pressed) : false);
          st.val[b] = value;
          st.edge[b] = held && !st.held[b];
          st.up[b] = !held && st.held[b];
          st.held[b] = held;
          if (held) anyHeld = true;
        }
        const big = Math.max(Math.abs(st.axes[0]), Math.abs(st.axes[1]), Math.abs(st.axes[2]), Math.abs(st.axes[3]));
        if (st.blocked) {
          if (!anyHeld && big < 0.25) st.blocked = false;
          st.edge.fill(false);
        }
        const anyEdge = st.edge.some(Boolean);
        if (anyEdge || big > 0.25) {
          if (this.lastDevice !== 'pad' || this.activePad !== i) { this.lastDevice = 'pad'; this.activePad = i; }
        }
        if (anyEdge) { this._gesture(); }
        if (anyEdge || big > 0.3) this.activity = true;
        this._padMenu(st, dt, verbs);
      } else if (st.connected) {
        st.connected = false; this.lostPads.push(i);
        st.axes.fill(0); st.val.fill(0); st.held.fill(false); st.edge.fill(false);
      }
    }
    // Mouse
    this.btnEdge = this.btnLatch;
    this.btnLatch = 0;
    const bothNow = (this.buttons & 3) === 3;
    this.bothEdge = bothNow && !this.bothWas;
    this.bothWas = bothNow;
    this.travelT += dt;
    if (this.travel > 8) { this.activity = true; this.travel = 0; this.travelT = 0; }
    if (this.travelT > 0.5) { this.travel = 0; this.travelT = 0; }
    if (this.blocked) {
      if (this.down.size === 0 && this.buttons === 0) this.blocked = false;
      this.pressed.clear(); this.btnEdge = 0; this.bothEdge = false;
    }
    // Keys latched since the last poll
    const pk = this.pressed;
    if (pk.has('arrowup') || pk.has('w')) verbs.add('up');
    if (pk.has('arrowdown') || pk.has('s')) verbs.add('down');
    if (pk.has('arrowleft') || pk.has('a')) verbs.add('left');
    if (pk.has('arrowright') || pk.has('d')) verbs.add('right');
    if (pk.has('enter') || pk.has('space')) verbs.add('confirm');
    if (pk.has('escape') || pk.has('backspace')) verbs.add('back');
    if (pk.has('escape')) verbs.add('pause');
    if (pk.has('pageup')) verbs.add('pageL');
    if (pk.has('pagedown')) verbs.add('pageR');
    if (pk.has('m') || pk.has('t')) verbs.add('alt');
    if (this.btnEdge & 2) verbs.add('rightclick');
    this._keyRepeat(dt, verbs);
    // Ring: keys move it at a steady rate and it stays where you leave it.
    let kx = 0, kz = 0;
    for (const k of this.down) { const v = WEIGHT_KEYS[k]; if (v) { kx += v[0]; kz += v[1]; } }
    for (const k of pk) { const v = WEIGHT_KEYS[k]; if (v && !this.down.has(k)) { kx += v[0] * 0.5; kz += v[1] * 0.5; } }
    this.keyX = kx; this.keyZ = kz;
    const km = Math.hypot(kx, kz);
    if (km > 0) {
      this.pointerActive = false;
      const n = km > 1 ? km : 1;
      this.ringX += (kx / n) * 1.6 * dt; this.ringZ += (kz / n) * 1.6 * dt;
      const r = Math.hypot(this.ringX, this.ringZ);
      if (r > 1) { this.ringX /= r; this.ringZ /= r; }
    }
    if (pk.has('c')) { this.ringX = 0; this.ringZ = 0; this.pointerActive = false; }
    const short = Math.min(this.w, this.h) === this.h ? this.h : this.h;
    let px = (this.mx - this.w / 2) / (0.33 * short), pz = (this.my - this.h / 2) / (0.33 * short);
    const pr = Math.hypot(px, pz);
    if (pr > 1) { px /= pr; pz /= pr; }
    this.pointerX = px; this.pointerZ = pz;
    if (this.pointerActive) { this.ringX = px; this.ringZ = pz; }
    // Feet ramp 0 to 1 in 0.12 s.
    const rampL = this.down.has('q') || (this.buttons & 1) || pk.has('q') ? 1 : 0;
    const rampR = this.down.has('e') || (this.buttons & 2) || pk.has('e') ? 1 : 0;
    const k = dt / 0.12;
    this.footLRamp = rampL ? Math.min(1, this.footLRamp + k) : Math.max(0, this.footLRamp - k);
    this.footRRamp = rampR ? Math.min(1, this.footRRamp + k) : Math.max(0, this.footRRamp - k);
    // Idle
    if (this.activity) this.idle = 0; else this.idle += dt;
    this.activityThisTick = this.activity;
    this.activity = false;
  }
  /** Called at the end of each fixed tick: this tick's latches are spent. */
  endTick() { this.pressed.clear(); this.released.clear(); this.moved = false; this.wheel = 0; this.dragX = 0; this.dragY = 0; this.btnEdge = 0; this.lostPads.length = 0; }
  _padMenu(st, dt, verbs) {
    if (st.blocked) return;
    const axes = st.axes;
    const dirs = { up: axes[1] < -0.55 || st.held[12], down: axes[1] > 0.55 || st.held[13], left: axes[0] < -0.55 || st.held[14], right: axes[0] > 0.55 || st.held[15] };
    for (const d of Object.keys(dirs)) {
      if (dirs[d]) {
        const t0 = st.moveHeld[d];
        st.moveHeld[d] = t0 + dt;
        if (t0 === 0 || (t0 > 0.42 && Math.floor((t0 - 0.42) / 0.14) !== Math.floor((t0 + dt - 0.42) / 0.14))) verbs.add(d);
      } else st.moveHeld[d] = 0;
    }
    if (st.edge[BTN.cross]) verbs.add('confirm');
    if (st.edge[BTN.circle]) verbs.add('back');
    if (st.edge[BTN.triangle]) verbs.add('alt');
    if (st.edge[BTN.l1]) verbs.add('pageL');
    if (st.edge[BTN.r1]) verbs.add('pageR');
    if (st.edge[BTN.options] && !st.held[BTN.create]) verbs.add('pause');
  }
  _keyRepeat(dt, verbs) {
    for (const [k, v] of [['arrowup', 'up'], ['w', 'up'], ['arrowdown', 'down'], ['s', 'down'], ['arrowleft', 'left'], ['a', 'left'], ['arrowright', 'right'], ['d', 'right']]) {
      if (this.down.has(k)) {
        const t0 = this.keyMoveT[k] || 0;
        this.keyMoveT[k] = t0 + dt;
        if (t0 > 0.42 && Math.floor((t0 - 0.42) / 0.14) !== Math.floor((t0 + dt - 0.42) / 0.14)) verbs.add(v);
      } else this.keyMoveT[k] = 0;
    }
  }
  verb(v) { return this.verbs.has(v); }
  /** Fill out with this player's verbs. source: 'any' | 'kbm' | 'pad:N'. */
  sample(source, out, dt) {
    let dev = 'kbm', pad = null;
    if (source === 'any') {
      if (this.lastDevice === 'pad') { dev = 'pad'; pad = this.pads[this.activePad]; }
    } else if (source && source.startsWith('pad:')) { dev = 'pad'; pad = this.pads[+source.slice(4)]; }
    out.device = dev;
    if (dev === 'pad' && pad) {
      const [lx, ly] = radial(pad.axes[0], pad.axes[1]);
      out.wishX = lx; out.wishZ = ly; out.moveX = lx; out.moveZ = ly;
      out.footL = pad.val[BTN.l2]; out.footR = pad.val[BTN.r2];
      out.footLPressed = pad.edge[BTN.l2]; out.footRPressed = pad.edge[BTN.r2];
      out.hop = pad.held[BTN.cross]; out.hopPressed = pad.edge[BTN.cross];
      out.flail = pad.edge[BTN.square]; out.breathe = pad.held[BTN.r1];
      out.ask = pad.edge[BTN.triangle]; out.use = pad.edge[BTN.cross];
      const [rx, ry] = radial(pad.axes[2], pad.axes[3]);
      out.lookX = rx; out.lookY = ry;
      out.tapA = false; out.tapD = false; out.keysActive = false; out.padIndex = pad.index;
      out.launch = pad.edge[BTN.cross];
    } else {
      const pk = this.pressed;
      out.wishX = this.ringX; out.wishZ = this.ringZ;
      const km = Math.hypot(this.keyX || 0, this.keyZ || 0);
      if (km > 0) { out.moveX = this.keyX / Math.max(1, km); out.moveZ = this.keyZ / Math.max(1, km); out.keysActive = true; }
      else if (this.pointerActive) { out.moveX = this.pointerX; out.moveZ = this.pointerZ; out.keysActive = false; }
      else { out.moveX = 0; out.moveZ = 0; out.keysActive = false; }
      const bl = this.btnEdge & 1, br = this.btnEdge & 2;
      out.footL = this.footLRamp; out.footR = this.footRRamp;
      out.footLPressed = pk.has('q') || !!bl; out.footRPressed = pk.has('e') || !!br;
      out.hop = this.down.has('space') || (this.buttons & 3) === 3;
      out.hopPressed = pk.has('space') || this.bothEdge;
      out.flail = pk.has('f') || !!(this.btnEdge & 4);
      out.breathe = this.down.has('shift');
      out.ask = pk.has('t'); out.use = pk.has('enter') || pk.has('e');
      out.lookX = 0; out.lookY = 0;
      out.tapA = pk.has('a') || pk.has('arrowleft'); out.tapD = pk.has('d') || pk.has('arrowright');
      out.launch = pk.has('space') || !!(this.btnEdge & 4);
      out.padIndex = -1;
    }
    return out;
  }
}

export const blankInput = () => ({
  device: 'kbm', wishX: 0, wishZ: 0, moveX: 0, moveZ: 0, footL: 0, footR: 0, footLPressed: false, footRPressed: false,
  hop: false, hopPressed: false, flail: false, breathe: false, ask: false, use: false, lookX: 0, lookY: 0, tapA: false, tapD: false, keysActive: false, padIndex: -1, useMove: false, launch: false,
});
