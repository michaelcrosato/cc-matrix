// Keys, mouse and latched pad state become per-player actions. Tracks the last device (for prompts) and idle time (for attract mode).
const KEYS = { confirm: ['Enter', 'NumpadEnter'], back: ['Escape', 'Backspace'], alt: ['KeyT'], info: ['KeyI'], tabL: ['KeyQ'], tabR: ['KeyE', 'Tab'], pause: ['Escape'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'] };
const PAD = { confirm: 0, back: 1, alt: 2, info: 3, tabL: 4, tabR: 5, pause: 9, up: 12, down: 13, left: 14, right: 15 };
const ALL_ACTIONS = Object.keys(KEYS), DIRS = ['up', 'down', 'left', 'right'];
const WATCH_KEYS = new Set(['Enter', 'NumpadEnter', 'Escape', 'Backspace', 'KeyT', 'KeyI', 'KeyQ', 'KeyE', 'Tab', 'ArrowUp', 'KeyW', 'ArrowDown', 'KeyS', 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD', 'Space', 'KeyC', 'KeyB', 'KeyR', 'ShiftLeft', 'ControlLeft', 'KeyM', 'KeyP', 'F1', 'F2']);
export class Actions {
  constructor(app) {
    this.app = app; this.device = 'kb'; this.idle = 0; this.pads = []; this.prevPads = []; this.frame = -1; this.now = {}; this.prev = {}; this.pressedSet = {}; this.repeat = {}; this.injected = []; this.anyInput = false; this.shiftQ = [{ up: 0, down: 0 }, { up: 0, down: 0 }];
    this.seat = [this.newSeat(), this.newSeat()]; this.mouseMoved = false; this.lastPointer = { x: 0, y: 0 }; this.wheel = 0; this.click = false; this.rightClick = false; this.touchDown = false; this.sawKey = false; this.keysDown = new Set();
  }
  newSeat() { return { steer: 0, throttle: 0, brake: 0, digitalT: false, digitalB: false, triHold: 0, triWas: false, cameraTap: false, recoverHeld: 0, seenAnalogT: false, seenAnalogB: false }; }
  /** Once per frame, at the top of whichever hook runs first. */
  latch(ctx) {
    if (ctx.engine.frame === this.frame) return false;
    this.frame = ctx.engine.frame;
    const input = ctx.input;
    for (const cmd of input.commands) if (cmd && cmd.pads) { this.prevPadsRaw = this.pads; this.pads = cmd.pads; }
    let active = false;
    // pads: anything moved by more than 0.2 counts as input
    const prevPads = this.prevPads;
    for (const p of this.pads) { const o = prevPads.find((x) => x.i === p.i); if (!o) { active = true; continue; } let moved = false; p.b.forEach((v, k) => { if (Math.abs(v - (o.b[k] ?? 0)) > 0.2) moved = true; }); p.a.forEach((v, k) => { if (Math.abs(v - (o.a[k] ?? 0)) > 0.2) moved = true; }); if (moved) { active = true; this.device = 'pad'; } }
    this.padNow = this.pads[0] ?? null;
    // keys
    let keyActive = false;
    for (const code of WATCH_KEYS) if (input.wasPressed(code)) keyActive = true;
    if (keyActive) { this.device = 'kb'; active = true; this.sawKey = true; }
    if (this.anyKeyEvent) { active = true; this.anyKeyEvent = false; this.sawKey = true; }
    // mouse
    const pt = input.pointer; this.mouseMoved = false;
    const dpx = Math.hypot(pt.x - this.lastPointer.x, pt.y - this.lastPointer.y);
    if (dpx > 0.006 && pt.over !== false) { this.mouseMoved = true; this.lastPointer.x = pt.x; this.lastPointer.y = pt.y; if (!pt.touch) { this.device = this.device === 'pad' ? 'mouse' : 'mouse'; active = true; } }
    this.click = input.wasPressed('MouseLeft'); this.rightClick = input.wasPressed('MouseRight'); this.touchDown = input.wasPressed('Touch'); this.wheel = input.wheel;
    if (this.click || this.rightClick) { this.device = 'mouse'; active = true; }
    if (this.touchDown || this.wheel) active = true;
    // actions: edges
    this.prev = this.now; this.now = {}; this.pressedSet = {};
    const pad = this.mergedPad();
    for (const a of ALL_ACTIONS) { const held = input.anyDown(KEYS[a]) || this.padBtn(pad, a); this.now[a] = held; if (input.wasPressed(...KEYS[a]) || (this.padEdge(a))) this.pressedSet[a] = true; }
    if (pad) { const x = pad.a[0] ?? 0, y = pad.a[1] ?? 0; const was = this.stickDir ?? {}; const d = { left: x < -0.5, right: x > 0.5, up: y < -0.5, down: y > 0.5 }; for (const k of DIRS) { if (d[k]) this.now[k] = true; if (d[k] && !was[k]) this.pressedSet[k] = true; } this.stickDir = d; }
    // Create + Options is the hub's: ignore Options while Create is held.
    if (pad && (pad.b[8] ?? 0) > 0.5 && (pad.b[9] ?? 0) > 0.5) { delete this.pressedSet.pause; this.now.pause = false; }
    for (const a of this.injected) this.pressedSet[a] = true;
    if (this.injected.length) active = true;
    this.injected.length = 0;
    // repeat for menu moves
    const wall = typeof performance !== 'undefined' ? performance.now() / 1000 : 0, dt = ctx.engine.manual || !this.lastWall ? 1 / 60 : Math.min(0.5, wall - this.lastWall); this.lastWall = wall;
    for (const k of DIRS) { const r = (this.repeat[k] ??= { t: 0 }); if (this.pressedSet[k]) r.t = -0.35; else if (this.now[k]) { r.t += dt; if (r.t >= 0) { r.t -= 0.09; this.pressedSet[k] = true; this.repeated = true; } } else r.t = 0; }
    this.idle = active ? 0 : this.idle + dt;
    this.anyInput = active;
    // shift presses wait for the next fixed step
    this.queueShifts(0, input, pad); if (this.app.couch) this.queueShifts(1, input, this.padForSeat(1));
    this.prevPads = this.pads;
    return true;
  }
  mergedPad() { return this.pads.find((p) => p.b.some((v) => v > 0.1) || p.a.some((v) => Math.abs(v) > 0.15)) ?? this.pads[0] ?? null; }
  padBtn(pad, a) { return !!pad && (pad.b[PAD[a]] ?? 0) > 0.5; }
  padEdge(a) { const k = PAD[a]; for (const p of this.pads) { const o = this.prevPads.find((x) => x.i === p.i); if ((p.b[k] ?? 0) > 0.5 && (o?.b[k] ?? 0) <= 0.5) return true; } return false; }
  pressed(a) { return !!this.pressedSet[a]; }
  down(a) { return !!this.now[a]; }
  inject(a) { this.injected.push(a); }
  consume(a) { const v = !!this.pressedSet[a]; delete this.pressedSet[a]; return v; }
  /** Which pad belongs to a seat. Single player: whichever is active. Couch: P1 is pad 0, P2 is pad 1. */
  padForSeat(seat) { if (!this.app.couch) return seat === 0 ? this.mergedPad() : null; return this.pads[seat] ?? null; }
  keysFor(seat) {
    if (!this.app.couch) return { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], go: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'], hand: ['Space'], up: ['KeyE', 'ShiftLeft'], dn: ['KeyQ', 'ControlLeft'], cam: ['KeyC'], back: ['KeyB'], rec: ['KeyR'] };
    const pads = this.pads.length;
    const wasd = { left: ['KeyA'], right: ['KeyD'], go: ['KeyW'], brake: ['KeyS'], hand: ['Space'], up: ['KeyE'], dn: ['KeyQ'], cam: ['KeyC'], back: ['KeyB'], rec: ['KeyR'] };
    const arrows = { left: ['ArrowLeft'], right: ['ArrowRight'], go: ['ArrowUp'], brake: ['ArrowDown'], hand: ['Enter', 'NumpadEnter'], up: ['Period'], dn: ['Comma'], cam: ['Slash'], back: ['KeyL'], rec: ['KeyK'] };
    if (pads >= 2) return null; // both on pads
    if (pads === 1) return seat === 1 ? wasd : null; // the pad is P1, the keyboard is P2
    return seat === 0 ? wasd : arrows;
  }
  queueShifts(seat, input, pad) {
    const k = this.keysFor(seat), q = this.shiftQ[seat];
    if (k) { if (input.wasPressed(...k.up)) q.up++; if (input.wasPressed(...k.dn)) q.down++; }
    if (pad) { const o = this.prevPads.find((x) => x.i === pad.i); if ((pad.b[5] ?? 0) > 0.5 && (o?.b[5] ?? 0) <= 0.5) q.up++; if ((pad.b[4] ?? 0) > 0.5 && (o?.b[4] ?? 0) <= 0.5) q.down++; }
  }
  /** Driving input for one seat, with the plan's filters. Called once per fixed step. */
  driving(ctx, seat, dt, s = this.app.settings) {
    const st = this.seat[seat], input = ctx.input, keys = this.keysFor(seat), pad = this.padForSeat(seat);
    let steerT = 0, thr = 0, brk = 0, hand = false, analogSteer = false, tKey = false, bKey = false;
    if (keys) { if (input.anyDown(keys.left)) steerT -= 1; if (input.anyDown(keys.right)) steerT += 1; if (input.anyDown(keys.go)) { thr = 1; tKey = true; } if (input.anyDown(keys.brake)) { brk = 1; bKey = true; } if (input.anyDown(keys.hand)) hand = true; }
    if (pad) {
      let x = pad.a[0] ?? 0; const dz = 0.08, mag = Math.abs(x);
      if (mag > dz) { x = Math.sign(x) * Math.pow((mag - dz) / (1 - dz), s.steerCurve ?? 1.4); analogSteer = true; steerT = x; }
      const r2 = pad.b[7] ?? 0, l2 = pad.b[6] ?? 0;
      if (r2 > 0 && r2 < 1) st.seenAnalogT = true; if (l2 > 0 && l2 < 1) st.seenAnalogB = true;
      if (r2 > 0.02) { thr = Math.max(thr, r2); if (!st.seenAnalogT) tKey = true; } if (l2 > 0.02) { brk = Math.max(brk, l2); if (!st.seenAnalogB) bKey = true; }
      if ((pad.b[2] ?? 0) > 0.5) hand = true;
      if (pad.b[12] > 0.5 && !analogSteer) { /* d-pad up is free */ }
      if ((pad.b[14] ?? 0) > 0.5) steerT = -1; if ((pad.b[15] ?? 0) > 0.5) steerT = 1;
    }
    if (s.mouseSteer && seat === 0 && !this.app.couch) { const pt = input.pointer; steerT = Math.max(-1, Math.min(1, pt.x * 1.4)); analogSteer = true; if (input.isDown('MouseLeft')) { thr = 1; tKey = true; } if (input.isDown('MouseRight')) { brk = 1; bKey = true; } }
    // filters: keyboard steering goes toward ±1 at 3.2/s, returns at 6/s; digital pedals ramp over 0.1 s
    if (analogSteer) st.steer = steerT;
    else { const rate = steerT === 0 ? 6 : Math.sign(steerT) !== Math.sign(st.steer) && st.steer !== 0 ? 6 : 3.2, d = steerT - st.steer, m = rate * dt; st.steer += Math.max(-m, Math.min(m, d)); }
    const ramp = (cur, tgt, digital) => (digital ? cur + Math.max(-dt / 0.1, Math.min(dt / 0.1, tgt - cur)) : tgt);
    st.throttle = ramp(st.throttle, thr, tKey || thr === 0); st.brake = ramp(st.brake, brk, bKey || brk === 0);
    const q = this.shiftQ[seat], up = q.up > 0, down = q.down > 0; q.up = 0; q.down = 0;
    return { steer: st.steer, throttle: st.throttle, brake: st.brake, handbrake: hand, up, down };
  }
  /** Tap camera, hold to recover: per frame. Returns { camera, lookBack, recover, orbitX, orbitY }. */
  driveExtras(ctx, seat, dt) {
    const st = this.seat[seat], input = ctx.input, keys = this.keysFor(seat), pad = this.padForSeat(seat);
    let cam = false, lookBack = false, rec = false, ox = 0, oy = 0;
    const tri = !!pad && (pad.b[3] ?? 0) > 0.5;
    if (tri) st.triHold += dt; else { if (st.triWas && st.triHold < 0.3) cam = true; st.triHold = 0; }
    st.triWas = tri;
    if (tri && st.triHold >= 0.3) rec = true;
    if (keys) { if (input.wasPressed(...keys.cam)) cam = true; if (input.anyDown(keys.back)) lookBack = true; if (input.anyDown(keys.rec)) rec = true; }
    if (pad && (pad.b[1] ?? 0) > 0.5) lookBack = true;
    if (pad) { ox = Math.abs(pad.a[2] ?? 0) > 0.15 ? pad.a[2] : 0; oy = Math.abs(pad.a[3] ?? 0) > 0.15 ? pad.a[3] : 0; }
    st.recoverHeld = rec ? st.recoverHeld + dt : 0;
    return { camera: cam, lookBack, recoverHeld: st.recoverHeld, orbitX: ox, orbitY: oy };
  }
  /** Any input at all, for leaving attract mode. */
  get touched() { return this.anyInput; }
}
