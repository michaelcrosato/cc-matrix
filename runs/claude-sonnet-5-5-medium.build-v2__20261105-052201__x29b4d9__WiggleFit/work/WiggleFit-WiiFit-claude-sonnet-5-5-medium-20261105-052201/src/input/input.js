// Keyboard, mouse and gamepad, latched so quick taps are never lost (PLAN section 3).
const WEIGHT_KEYS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
export function normKey(e) {
  let c = e.code || e.key || '';
  if (c.length === 1) { if (c === ' ') return 'Space'; if (/[a-z]/i.test(c)) return 'Key' + c.toUpperCase(); if (/[0-9]/.test(c)) return 'Digit' + c; }
  if (c === 'Esc') return 'Escape';
  if (c === ' ') return 'Space';
  return c;
}
const dz = (v, d = 0.12) => (Math.abs(v) < d ? 0 : v);

class DevState {
  constructor(id) { this.id = id; this.L = 0; this.R = 0; this.ringX = 0; this.ringZ = 0; this.hop = false; this.flail = false; this.breath = false; this.ask = false; this.use = false; this.stickX = 0; this.stickY = 0; this.hopHeld = false; this.lookX = 0; this.lookY = 0; this.rawL = 0; this.rawR = 0; this.keyX = 0; this.keyY = 0; this.keyHeld = false; this.mouseX = 0; this.mouseY = 0; }
}
export class Input {
  constructor() {
    this.keys = new Set(); this.latched = new Set(); this.mouseButtons = 0; this.mouseLatch = 0;
    this.px = 0; this.py = 0; this.moved = false; this.pxMoved = false; this.pointerMoveAcc = 0;
    this.lastDevice = 'kbm'; this.lastPad = 0; this.nav = []; this.anyInput = 0; this.wheel = 0;
    this.devs = {}; this.padPrev = {}; this.stickRep = {}; this.clickQueue = []; this.hoverQueue = [];
    this.createHeld = false; this.padCount = 0; this.padLost = false; this.lastPadSeen = false;
    this.pressedEdge = new Set(); // codes pressed this tick (for edge use)
    this.listeners = [];
    this.audioWake = null; this.exitOnAny = null;
    this.bind();
  }
  bind() {
    const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); this.listeners.push([t, ev, fn]); };
    on(window, 'keydown', (e) => {
      const c = normKey(e); if (!e.repeat) { this.latched.add(c); this.pressedEdge.add(c); this.noteInput('kbm', 'key'); this.navKey(c); }
      this.keys.add(c);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(c) && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) e.preventDefault();
      if (this.audioWake) this.audioWake();
    }, true);
    on(window, 'keyup', (e) => { this.keys.delete(normKey(e)); }, true);
    on(window, 'blur', () => { this.keys.clear(); this.mouseButtons = 0; });
    const mb = (e) => { if (e.buttons !== undefined) { this.mouseButtons = e.buttons; this.mouseLatch |= e.buttons; } };
    on(window, 'pointerdown', (e) => { mb(e); this.noteInput('kbm', 'mouse'); this.pxMoved = true; this.px = e.clientX; this.py = e.clientY; if (this.audioWake) this.audioWake(); }, true);
    on(window, 'pointerup', (e) => { mb(e); }, true);
    on(window, 'pointermove', (e) => {
      mb(e); const dx = e.clientX - this.px, dy = e.clientY - this.py;
      if (dx !== 0 || dy !== 0) {
        this.pointerMoveAcc += Math.hypot(dx, dy); this.moveEvt = (this.moveEvt || 0) + 1; this.px = e.clientX; this.py = e.clientY; this.pxMoved = true;
        if (this.pointerMoveAcc > 4) { this.noteInput('kbm', 'move'); this.hoverQueue.push({ x: e.clientX, y: e.clientY }); }
      }
    }, true);
    on(window, 'contextmenu', (e) => e.preventDefault());
    on(window, 'wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
  }
  noteInput(dev, kind) {
    if (dev === 'kbm' && this.lastDevice !== 'kbm') { this.lastDevice = 'kbm'; this.onDevice && this.onDevice('kbm'); }
    this.anyInput++;
    if (kind === 'move') { /* exit threshold handled by consumers via pointerMoveAcc */ }
  }
  navKey(c) {
    const m = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Enter: 'ok', Space: 'ok', NumpadEnter: 'ok', Escape: 'back', Backspace: 'back', KeyT: 'tri', KeyM: 'tri' };
    if (m[c]) this.nav.push({ a: m[c], dev: 'kbm', c });
    if (c === 'Escape') this.nav.push({ a: 'pause', dev: 'kbm', c });
  }
  getPads() { let l = []; try { l = navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch (e) { l = []; } return l.filter((p) => p && p.connected && p.mapping === 'standard'); }
  dev(id) { return this.devs[id] || (this.devs[id] = new DevState(id)); }
  // called once per fixed tick
  poll(dt, ctx = {}) {
    const pads = this.getPads(); this.padCount = pads.length;
    if (this.lastPadSeen && !pads.length) this.padLost = true; if (pads.length) this.padLost = false; this.lastPadSeen = pads.length > 0;
    const k = (c) => this.keys.has(c) || this.latched.has(c);
    const mbm = this.mouseButtons | this.mouseLatch;
    // keyboard + mouse device
    const d = this.dev('kbm');
    let kx = 0, ky = 0; for (const c in WEIGHT_KEYS) if (k(c)) { kx += WEIGHT_KEYS[c][0]; ky += WEIGHT_KEYS[c][1]; }
    const km = Math.hypot(kx, ky); if (km > 1) { kx /= km; ky /= km; }
    d.keyX = kx; d.keyY = ky; d.keyHeld = km > 0;
    if (km > 0) d.mode = 'ring'; if ((this.moveEvt || 0) !== (this.lastMoveEvt || 0)) { this.lastMoveEvt = this.moveEvt; if (this.pointerMoveAcc > 4 && km === 0) d.mode = 'mouse'; }
    const sp = ctx.ringSpeed || 1.6;
    d.ringX = Math.max(-1, Math.min(1, d.ringX + kx * sp * dt)); d.ringZ = Math.max(-1, Math.min(1, d.ringZ + ky * sp * dt));
    if (k('KeyC')) { d.ringX = 0; d.ringZ = 0; }
    const vh = window.innerHeight || 720; const mx = ((this.px - (window.innerWidth || 1280) / 2) / (vh * 0.33)), my = ((this.py - vh / 2) / (vh * 0.33));
    const mm = Math.hypot(mx, my); d.mouseX = this.pxMoved ? (mm > 1 ? mx / mm : mx) : 0; d.mouseY = this.pxMoved ? (mm > 1 ? my / mm : my) : 0;
    const target = (a, b) => (a ? 1 : 0);
    const lt = k('KeyQ') || (mbm & 1), rt = k('KeyE') || (mbm & 2);
    d.rawL = target(lt); d.rawR = target(rt);
    d.L = this.ramp(d.L, d.rawL, dt); d.R = this.ramp(d.R, d.rawR, dt);
    const bothMouse = (mbm & 3) === 3;
    d.hop = k('Space') || bothMouse; d.flail = k('KeyF') || !!(mbm & 4); d.breath = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); d.ask = k('KeyT'); d.use = k('Enter') || k('KeyE');
    d.hopEdge = (this.latched.has('Space') || (this.mouseLatch & 3) === 3); d.flailEdge = this.latched.has('KeyF') || !!(this.mouseLatch & 4);
    d.footL = this.latched.has('KeyQ') || !!(this.mouseLatch & 1); d.footR = this.latched.has('KeyE') || !!(this.mouseLatch & 2);
    d.askEdge = this.latched.has('KeyT'); d.useEdge = this.latched.has('Enter') || this.latched.has('KeyE'); d.keyA = this.latched.has('KeyA') || this.latched.has('ArrowLeft'); d.keyD = this.latched.has('KeyD') || this.latched.has('ArrowRight');
    d.lookX = 0; d.lookY = 0;
    // pads
    this.createHeld = false;
    for (const p of pads) {
      const id = 'pad' + p.index, s = this.dev(id), b = (i) => (p.buttons[i] ? p.buttons[i] : { pressed: false, value: 0 });
      const prev = this.padPrev[id] || (this.padPrev[id] = []);
      const down = (i) => b(i).pressed || b(i).value > 0.5;
      if (down(8)) this.createHeld = true;
      s.stickX = dz(p.axes[0] || 0); s.stickY = dz(p.axes[1] || 0);
      s.rawL = b(6).value || (b(6).pressed ? 1 : 0); s.rawR = b(7).value || (b(7).pressed ? 1 : 0); s.L = s.rawL; s.R = s.rawR;
      s.hop = down(0); s.flail = down(2); s.breath = down(5); s.ask = down(3); s.use = down(0);
      s.lookX = dz(p.axes[2] || 0); s.lookY = dz(p.axes[3] || 0);
      const edge = (i) => down(i) && !prev[i];
      s.hopEdge = edge(0); s.flailEdge = edge(2); s.askEdge = edge(3); s.useEdge = edge(0);
      s.footL = s.rawL > 0.55 && !(prev.L); s.footR = s.rawR > 0.55 && !(prev.R);
      let any = false;
      for (let i = 0; i < 17; i++) { if (edge(i)) { any = true; if (i !== 8 && !(i === 9 && this.createHeld)) this.padNav(i, p.index); } }
      if (Math.hypot(s.stickX, s.stickY) > 0.3 || Math.hypot(s.lookX, s.lookY) > 0.3) any = true;
      if (Math.hypot(s.stickX, s.stickY) > 0.25 || any) { if (this.lastDevice !== 'pad' || this.lastPad !== p.index) { this.lastDevice = 'pad'; this.lastPad = p.index; this.onDevice && this.onDevice('pad'); } }
      if (any) { this.anyInput++; if (this.audioWake) this.audioWake(); }
      // stick navigation with repeat
      const sr = this.stickRep[id] || (this.stickRep[id] = { x: 0, y: 0, tx: 0, ty: 0 });
      this.stickNav(sr, s.stickX, s.stickY, dt, p.index);
      for (let i = 0; i < 17; i++) prev[i] = down(i); prev.L = s.rawL > 0.55; prev.R = s.rawR > 0.55;
    }
    // Create+Options belongs to the hub
  }
  stickNav(sr, x, y, dt, idx) {
    const f = (v, key, tkey, neg, pos) => {
      const dir = v > 0.55 ? 1 : v < -0.55 ? -1 : 0;
      if (dir === 0) { sr[key] = 0; sr[tkey] = 0; return; }
      if (sr[key] !== dir) { sr[key] = dir; sr[tkey] = 0.38; this.nav.push({ a: dir > 0 ? pos : neg, dev: 'pad', pad: idx }); } else { sr[tkey] -= dt; if (sr[tkey] <= 0) { sr[tkey] = 0.12; this.nav.push({ a: dir > 0 ? pos : neg, dev: 'pad', pad: idx }); } }
    };
    f(x, 'x', 'tx', 'left', 'right'); f(y, 'y', 'ty', 'up', 'down');
  }
  padNav(i, idx) {
    const m = { 0: 'ok', 1: 'back', 3: 'tri', 12: 'up', 13: 'down', 14: 'left', 15: 'right', 9: 'pause', 4: 'pageL', 5: 'pageR', 2: 'sq' };
    if (m[i]) this.nav.push({ a: m[i], dev: 'pad', pad: idx });
  }
  ramp(v, t, dt) { const s = dt / 0.12; return t > v ? Math.min(t, v + s) : Math.max(t, v - s); }
  endTick() { this.latched.clear(); this.mouseLatch = 0; this.pressedEdge.clear(); this.wheel = 0; }
  drainNav() { const n = this.nav; this.nav = []; return n; }
  drainHover() { const h = this.hoverQueue; this.hoverQueue = []; return h; }
  resetAccum() { this.pointerMoveAcc = 0; this.anyInput = 0; }
  // Weight vector for balance events: stick/ring/mouse by device (screen-relative; camera yaw applied by caller)
  weight(id) {
    const s = this.dev(id);
    if (id === 'kbm') { if (s.keyHeld || s.mode !== 'mouse') return [s.ringX, s.ringZ, 'ring']; return [s.mouseX, s.mouseY, 'mouse']; }
    return [s.stickX, s.stickY, 'stick'];
  }
  // direct steering (walking etc.)
  steer(id) { const s = this.dev(id); if (id === 'kbm') return [s.keyX, s.keyY]; return [s.stickX, s.stickY]; }
  // the "asking" position to draw on the disc
  asking(id) { const w = this.weight(id); return [w[0], w[1]]; }
}
