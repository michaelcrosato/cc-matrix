// Actions: keys, mouse and raw gamepads turned into per-frame actions. Plan section 4 (Input) and 7 (Controls).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function readPads() { try { const l = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []; return [...l].filter((p) => p && p.connected); } catch { return []; } }
const btn = (p, i) => (p?.buttons?.[i]?.pressed ? 1 : 0), val = (p, i) => p?.buttons?.[i]?.value ?? 0;
export class Actions {
  constructor() {
    this.last = 'key'; this.idle = 0; this.lastAt = performance.now(); this.cfg = { deadzone: 0.08, curve: 1.4, response: 1, mouseSteer: false };
    this.kSteer = 0; this.kThr = 0; this.kBrk = 0; this.frameNo = -1; this.virtual = new Set(); this.rep = { x: { d: 0, t: 0 }, y: { d: 0, t: 0 } };
    this.prevPad = {}; this.padSig = ''; this.padIndex = 0; this.keyMap = null; this.reset();
    this.mouse = { x: 0, y: 0, moved: false, down: false, pressed: false, right: false, wheel: 0, px: 0, py: 0 };
  }
  reset() {
    Object.assign(this, { steer: 0, throttle: 0, brake: 0, handbrake: false, up: false, down: false, camera: false, lookBack: false, recoverHold: false, pause: false, confirm: false, back: false, info: false, alt: false, tabL: false, tabR: false, moveX: 0, moveY: 0, anyPress: false, lookX: 0, lookY: 0, holdBack: false, holdInfo: false, holdConfirm: false, hold: {} });
  }
  inject(name) { this.virtual.add(name); }
  // Called once per frame (first caller wins). pad: index in readPads(); keys: map of key codes (couch duel P2 uses other keys)
  frame(ctx, dt, o = {}) {
    if (ctx.engine.frame === this.frameNo && !o.force) return; this.frameNo = ctx.engine.frame; const I = ctx.input; this.reset();
    // Pads travel through ctx.input.send so the engine's recordings replay them (one frame of latency). Latch the newest snapshot.
    for (const c of ctx.input.commands ?? []) if (c && c.pads) this.remote = c.pads;
    const live = readPads(), q = (v) => Math.round(v * 255) / 255, snap = JSON.stringify(live.map((p) => [p.axes.map(q), p.buttons.map((b) => (b.pressed ? 1 : 0) + ':' + q(b.value))]));
    if (snap !== this.lastSnap && !ctx.input.playing) { this.lastSnap = snap; try { ctx.input.send({ pads: live.map((p) => ({ axes: p.axes.map(q), buttons: p.buttons.map((b) => ({ pressed: b.pressed, value: q(b.value) })) })) }); } catch {} }
    const K = o.keys ?? DEFAULT_KEYS, pads = this.remote ? this.remote.map((p) => ({ ...p, connected: true })) : live, pad = o.pad === null ? null : pads[o.pad ?? this.padIndex] ?? null, v = this.virtual;
    const key = (c) => c.some((x) => I.isDown(x)), kp = (c) => c.some((x) => I.wasPressed(x)), vp = (n) => v.has(n);
    let any = false;
    // pad state
    const P = {}; if (pad) { P.x = pad.axes[0] ?? 0; P.y = pad.axes[1] ?? 0; P.rx = pad.axes[2] ?? 0; P.ry = pad.axes[3] ?? 0; for (let i = 0; i < 17; i++) P[i] = btn(pad, i); P.l2 = val(pad, 6); P.r2 = val(pad, 7); }
    const pEdge = (i) => !!pad && P[i] && !this.prevPad[i];
    const createHeld = pad && P[8]; const padChanged = pad && (pEdge(0) || pEdge(1) || pEdge(2) || pEdge(3) || pEdge(4) || pEdge(5) || pEdge(9) || pEdge(12) || pEdge(13) || pEdge(14) || pEdge(15) || Math.abs(P.x) > 0.5 || Math.abs(P.y) > 0.5 || P.l2 > 0.2 || P.r2 > 0.2);
    if (padChanged) { this.last = 'pad'; any = true; try { ctx.engine.audio.unlock(); } catch {} }
    // keyboard last-device
    const kAny = K.any.some((x) => I.wasPressed(x)); if (kAny) { this.last = 'key'; any = true; }
    const m = I.pointer, mx = m.x, my = m.y; if (Math.abs(mx - this.mouse.px) * 240 + Math.abs(my - this.mouse.py) * 135 > 3 && m.over) { this.mouse.moved = true; this.mouse.px = mx; this.mouse.py = my; this.last = 'mouse'; any = true; } else this.mouse.moved = false;
    this.mouse.x = mx; this.mouse.y = my; this.mouse.pressed = I.wasPressed('MouseLeft'); this.mouse.rpressed = I.wasPressed('MouseRight'); this.mouse.down = I.isDown('MouseLeft'); this.mouse.rdown = I.isDown('MouseRight'); this.mouse.wheel = I.wheel; this.mouse.over = m.over;
    if (this.mouse.pressed || this.mouse.rpressed || this.mouse.wheel) { this.last = 'mouse'; any = true; }
    if (I.wasPressed('Touch')) any = true;
    const nowMs = performance.now(); if (any) this.lastAt = nowMs; this.idle = (nowMs - this.lastAt) / 1000;
    // --- driving ---
    const kl = key(K.left), kr = key(K.right), tgt = (kr ? 1 : 0) - (kl ? 1 : 0);
    if (tgt !== 0) { const r = this.kSteer === 0 || Math.sign(tgt) === Math.sign(this.kSteer) ? 3.2 : 6; this.kSteer = clamp(this.kSteer + tgt * r * dt, -1, 1); } else this.kSteer = Math.abs(this.kSteer) <= 6 * dt ? 0 : this.kSteer - Math.sign(this.kSteer) * 6 * dt;
    const kt = key(K.up) ? 1 : 0, kb = key(K.down) ? 1 : 0; this.kThr += clamp(kt - this.kThr, -dt / 0.1, dt / 0.1); this.kBrk += clamp(kb - this.kBrk, -dt / 0.1, dt / 0.1);
    let sx = 0; if (pad) { const r = Math.hypot(P.x, P.y), dz = this.cfg.deadzone; if (r > dz) { const k = (r - dz) / (1 - dz) / r; const ax = P.x * k; sx = Math.sign(ax) * Math.pow(Math.min(1, Math.abs(ax)), this.cfg.curve) * this.cfg.response; } }
    let trigT = pad ? (P.r2 > 0.02 ? P.r2 : 0) : 0, trigB = pad ? (P.l2 > 0.02 ? P.l2 : 0) : 0; if (pad && (pad.buttons?.[7]?.value === 0 || pad.buttons?.[7]?.value === 1) && trigT === 1) { this.dThr = (this.dThr ?? 0) + clamp(1 - (this.dThr ?? 0), -dt / 0.1, dt / 0.1); trigT = this.dThr; } else this.dThr = 0;
    this.steer = clamp(this.kSteer + sx, -1, 1); this.throttle = Math.max(this.kThr, trigT); this.brake = Math.max(this.kBrk, trigB);
    if (this.cfg.mouseSteer && this.mouse.over) { this.steer = clamp(this.mouse.x * 1.6, -1, 1); this.throttle = Math.max(this.throttle, this.mouse.down ? 1 : 0); this.brake = Math.max(this.brake, this.mouse.rdown ? 1 : 0); }
    this.handbrake = key(K.hand) || (pad && P[2] === 1);
    this.up = kp(K.up2) || pEdge(5) || vp('up'); this.down = kp(K.down2) || pEdge(4) || vp('down');
    this.camera = kp(K.cam) || pEdge(3) || vp('camera'); this.lookBack = key(K.back2) || (pad && P[1] === 1); this.recoverHold = key(K.rec) || (pad && P[3] === 1) || v.has('recoverHold');
    this.lookX = pad ? (Math.abs(P.rx) > 0.15 ? P.rx : 0) : 0; this.lookY = pad ? (Math.abs(P.ry) > 0.15 ? P.ry : 0) : 0; this.orbit = this.mouse.rdown && this.mouse.down === false;
    // --- menus ---
    this.confirm = kp(K.confirm) || pEdge(0) || this.mouse.pressed || vp('confirm'); this.back = kp(K.back) || pEdge(1) || this.mouse.rpressed || vp('back');
    this.info = kp(K.cam) || pEdge(3) || vp('info'); this.alt = kp(K.alt) || pEdge(2) || vp('alt'); this.tabL = kp(K.tabL) || pEdge(4) || vp('tabL'); this.tabR = kp(K.tabR) || pEdge(5) || vp('tabR');
    this.pause = kp(K.pause) || (pEdge(9) && !createHeld) || vp('pause'); this.confirmKey = kp(K.confirm) || pEdge(0) || vp('confirm');
    this.holdBack = key(K.back) || (pad && P[1] === 1); this.holdInfo = key(K.cam) || (pad && P[3] === 1); this.holdConfirm = key(K.confirm) || (pad && P[0] === 1);
    let mx2 = (key(K.mr) ? 1 : 0) - (key(K.ml) ? 1 : 0), my2 = (key(K.md) ? 1 : 0) - (key(K.mu) ? 1 : 0);
    if (pad) { if (P[14] || P.x < -0.55) mx2 = -1; if (P[15] || P.x > 0.55) mx2 = 1; if (P[12] || P.y < -0.55) my2 = -1; if (P[13] || P.y > 0.55) my2 = 1; }
    this.moveX = this.repeat(this.rep.x, mx2, dt); this.moveY = this.repeat(this.rep.y, my2, dt);
    if (vp('left')) this.moveX = -1; if (vp('right')) this.moveX = 1; if (vp('up_')) this.moveY = -1; if (vp('down_')) this.moveY = 1;
    for (const k of Object.keys(P)) this.prevPad[k] = P[k]; if (!pad) this.prevPad = {};
    this.anyPress = this.confirm || this.back || this.pause || this.info || this.alt || this.moveX || this.moveY || kAny || padChanged;
    v.clear();
  }
  repeat(r, d, dt) { if (d === 0) { r.d = 0; r.t = 0; return 0; } if (d !== r.d) { r.d = d; r.t = 0.35; return d; } r.t -= dt; if (r.t <= 0) { r.t = 0.09; return d; } return 0; }
}
export const DEFAULT_KEYS = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], hand: ['Space'], up2: ['KeyE', 'ShiftLeft'], down2: ['KeyQ', 'ControlLeft'], cam: ['KeyC'], back2: ['KeyB'], rec: ['KeyR'],
  confirm: ['Enter', 'NumpadEnter'], back: ['Escape', 'Backspace'], alt: ['Space', 'KeyX'], tabL: ['KeyQ', 'PageUp'], tabR: ['KeyE', 'Tab', 'PageDown'], pause: ['Escape'], ml: ['KeyA', 'ArrowLeft'], mr: ['KeyD', 'ArrowRight'], mu: ['KeyW', 'ArrowUp'], md: ['KeyS', 'ArrowDown'],
  any: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Space', 'KeyQ', 'KeyE', 'KeyC', 'KeyB', 'KeyR', 'Tab', 'Backspace', 'KeyX', 'KeyM'],
};
// Couch duel keys: with no pad, P1 is WASD (+Space/shift) and P2 is the arrows with Enter.
export const P1_KEYS = { ...DEFAULT_KEYS, left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], hand: ['Space'], up2: ['KeyE'], down2: ['KeyQ'], cam: ['KeyC'], rec: ['KeyR'], pause: ['Escape'], any: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'] };
export const P2_KEYS = { ...DEFAULT_KEYS, left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], hand: ['Enter'], up2: ['ShiftRight', 'Period'], down2: ['ControlRight', 'Comma'], cam: ['Slash'], rec: ['Backslash'], pause: ['F9'], any: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'] };
