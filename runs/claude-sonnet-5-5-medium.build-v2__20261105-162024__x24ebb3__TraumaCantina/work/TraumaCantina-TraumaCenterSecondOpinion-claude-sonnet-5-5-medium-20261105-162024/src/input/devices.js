// Input: reads every pad itself (the engine merges them and has no analog triggers), tracks the last device used,
// and turns keys / pad / mouse into one menu "nav" state and per-seat operating input.
export const PAD = { X: 0, O: 1, SQ: 2, TRI: 3, L1: 4, R1: 5, L2: 6, R2: 7, CREATE: 8, OPT: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DZ = 0.2;
const safePads = () => { try { return (typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []) || []; } catch { return []; } };

export class Devices {
  constructor() {
    this.last = 'kb'; this.pads = [{}, {}, {}, {}]; this.activity = 0; this.lastActMs = 0; this.mouseMoved = 0; this.mouseSeen = false;
    this.keyDownAny = false; this.nav = this.emptyNav(); this.rep = { x: 0, y: 0, tx: 0, ty: 0 };
    this.touchOnly = false; this.rumbleOn = true; this.padCount = 0; this.keyEvents = new Set(); this.pressedNow = new Set();
    if (typeof window !== 'undefined') {
      const act = (kind) => { this.activity++; this.lastActMs = performance.now(); if (kind) this.last = kind; };
      window.addEventListener('keydown', (e) => { if (!e.repeat) this.keyEvents.add(e.code); act('kb'); this.touchOnly = false; }, true);
      window.addEventListener('mousemove', () => { this.mouseMoved++; this.mouseSeen = true; act('kb'); }, true);
      window.addEventListener('mousedown', () => act('kb'), true);
      window.addEventListener('wheel', () => act('kb'), true);
      window.addEventListener('touchstart', () => { this.activity++; this.lastActMs = performance.now(); }, true);
      window.addEventListener('gamepadconnected', () => { this.activity++; this.touchOnly = false; });
    }
  }
  emptyNav() { return { x: 0, y: 0, confirm: false, back: false, tabL: false, tabR: false, extra: false, pause: false, click: null, rclick: null, wheel: 0, hover: null, any: false, skipHeld: false }; }
  /** Poll pads once per frame. */
  poll(dt, ctx) {
    // Presses that land while a slow frame is rendering would be missed by the engine's per-frame queue: keep our own.
    this.pressedNow = this.keyEvents; this.keyEvents = new Set();
    const inp0 = ctx?.input; if (inp0 && !inp0.__devPatched) { const orig = inp0.wasPressed.bind(inp0); inp0.wasPressed = (c) => orig(c) || this.pressedNow.has(c); inp0.__devPatched = true; }
    const gps = safePads(); let n = 0;
    for (let i = 0; i < 4; i++) {
      const g = gps[i], p = this.pads[i], prev = p.btn || [];
      if (!g || !g.connected) { p.connected = false; p.btn = []; p.press = []; continue; }
      n++; p.connected = true; p.id = g.id; p.act = g.vibrationActuator;
      const btn = g.buttons.map((b) => b.value > 0.5 || b.pressed), val = g.buttons.map((b) => b.value);
      p.press = btn.map((b, k) => b && !prev[k]); p.btn = btn; p.val = val; p.ax = g.axes.map((a) => (Math.abs(a) < DZ ? 0 : a));
      p.stick = [p.ax[0] || 0, p.ax[1] || 0]; p.rstick = [p.ax[2] || 0, p.ax[3] || 0];
      if (p.press.some(Boolean) || Math.hypot(...p.stick) > 0.6 || Math.hypot(...p.rstick) > 0.6) { this.last = 'pad'; this.activity++; this.lastActMs = performance.now(); this.touchOnly = false; }
    }
    this.padCount = n; this.buildNav(dt, ctx);
  }
  pad(i = 0) { return this.pads[i]; }
  padPress(k, idx = 0) { return !!(this.pads[idx].press && this.pads[idx].press[k]); }
  padDown(k, idx = 0) { return !!(this.pads[idx].btn && this.pads[idx].btn[k]); }
  anyPadPress(k) { return this.pads.some((p) => p.press && p.press[k]); }
  anyPadDown(k) { return this.pads.some((p) => p.btn && p.btn[k]); }
  buildNav(dt, ctx) {
    const inp = ctx?.input, nav = this.emptyNav();
    const kp = (c) => !!inp?.wasPressed(c);
    let dx = 0, dy = 0;
    for (let i = 0; i < 4; i++) { const p = this.pads[i]; if (!p.connected) continue; if (p.btn[PAD.LEFT] || p.stick[0] < -0.5) dx = -1; if (p.btn[PAD.RIGHT] || p.stick[0] > 0.5) dx = 1; if (p.btn[PAD.UP] || p.stick[1] < -0.5) dy = -1; if (p.btn[PAD.DOWN] || p.stick[1] > 0.5) dy = 1; }
    if (inp?.isDown('ArrowLeft') || inp?.isDown('KeyA')) dx = -1; if (inp?.isDown('ArrowRight') || inp?.isDown('KeyD')) dx = 1;
    if (inp?.isDown('ArrowUp') || inp?.isDown('KeyW')) dy = -1; if (inp?.isDown('ArrowDown') || inp?.isDown('KeyS')) dy = 1;
    const r = this.rep;
    for (const [ax, v, t] of [['x', dx, 'tx'], ['y', dy, 'ty']]) {
      if (v === 0) { r[ax] = 0; r[t] = 0; } else if (r[ax] !== v) { r[ax] = v; r[t] = 0.38; nav[ax] = v; } else { r[t] -= dt; if (r[t] <= 0) { r[t] = 0.11; nav[ax] = v; } }
    }
    nav.confirm = kp('Enter') || kp('Space') || this.anyPadPress(PAD.X);
    nav.back = kp('Escape') || kp('Backspace') || this.anyPadPress(PAD.O);
    nav.tabL = kp('KeyQ') || this.anyPadPress(PAD.L1); nav.tabR = kp('KeyE') || this.anyPadPress(PAD.R1);
    nav.extra = kp('KeyE') || this.anyPadPress(PAD.TRI) || kp('Tab'); nav.pause = kp('Escape') || this.anyPadPress(PAD.OPT);
    nav.skipHeld = !!(inp?.isDown('Escape') || this.anyPadDown(PAD.TRI));
    const hud = ctx?.hud;
    if (inp && hud && hud.width) {
      const art = (p) => [((p.x + 1) / 2) * hud.width, ((1 - p.y) / 2) * hud.height];
      if (this.mouseMoved && inp.pointer.over) { nav.hover = art(inp.pointer); }
      for (const be of inp.buttonEvents || []) { if (be.down ?? be.pressed) { const k = be.key || be.code || be.button; const pos = art(be.pointer || be); if (String(k).includes('Left') || k === 0) nav.click = pos; else if (String(k).includes('Right') || k === 2) nav.rclick = pos; } }
      nav.wheel = inp.wheel || 0;
    }
    this.mouseMoved = 0;
    nav.any = nav.x || nav.y || nav.confirm || nav.back || nav.click || nav.rclick || nav.tabL || nav.tabR || nav.extra || nav.pause;
    this.nav = nav; return nav;
  }
  /** Rumble: gamepad.vibrationActuator?.playEffect('dual-rumble', ...) */
  rumble(i, weak, strong, ms = 80) {
    if (!this.rumbleOn) return; const p = this.pads[i]; const a = p?.act;
    try { a?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch {}
  }
  rumbleAll(weak, strong, ms) { for (let i = 0; i < 4; i++) if (this.pads[i].connected) this.rumble(i, weak, strong, ms); }
}

/** Stick right-flick to wheel slot 0..7 (clockwise from top). */
export function wheelSlot(rx, ry) {
  if (Math.hypot(rx, ry) < 0.6) return -1;
  const a = Math.atan2(rx, -ry); // 0 = up, clockwise
  return Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
}
export const TOOL_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];
export const WHEEL = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];

/** Per-seat operating input. `src`: { kind:'mix' } (kb+mouse and pad 0), { kind:'kb' }, { kind:'pad', i }. */
export function readSeatInput(dev, ctx, src, st, pickFn) {
  const inp = ctx.input, out = { ax: 0, az: 0, px: null, pz: null, use: false, use2: false, force: 1, steady: false, gift: false, tool: undefined, rot: 0, tbd: 0, tag: false, quick: false };
  const useKb = src.kind === 'kb' || src.kind === 'mix', usePad = src.kind === 'pad' || src.kind === 'mix';
  const pi = src.kind === 'pad' ? src.i : 0, p = dev.pads[pi];
  if (useKb) {
    let ax = 0, az = 0;
    if (inp.isDown('KeyA') || inp.isDown('ArrowLeft')) ax -= 1; if (inp.isDown('KeyD') || inp.isDown('ArrowRight')) ax += 1;
    if (inp.isDown('KeyW') || inp.isDown('ArrowUp')) az -= 1; if (inp.isDown('KeyS') || inp.isDown('ArrowDown')) az += 1;
    if (ax || az) { out.ax = ax; out.az = az; st.keyDrive = true; }
    // mouse: pointer follows exactly while the mouse is the last device used
    if (dev.last === 'kb' && dev.mouseSeen && pickFn && inp.pointer.over && !(ax || az) && st.mouseActive !== false) { const r = pickFn(inp.pointer.x, inp.pointer.y); if (r) { out.px = r[0]; out.pz = r[1]; } }
    out.use = inp.isDown('MouseLeft') || inp.isDown('KeyJ'); out.use2 = inp.isDown('MouseRight') || inp.isDown('KeyK');
    out.steady = inp.isDown('ShiftLeft') || inp.isDown('ShiftRight'); out.gift = inp.isDown('Space');
    out.rot = (inp.isDown('KeyE') ? 1 : 0) - (inp.isDown('KeyQ') ? 1 : 0) + Math.sign(inp.wheel || 0) * 0;
    if (inp.wheel) st.wheelAcc = (st.wheelAcc || 0) + Math.sign(inp.wheel);
    for (let k = 0; k < 8; k++) if (inp.wasPressed(TOOL_KEYS[k])) out.tool = WHEEL[k];
    out.tag = inp.wasPressed('KeyE') && false; out.quick = inp.wasPressed('KeyF');
    if (inp.wasPressed('Tab')) out.tbd = 1;
    out.keyTag = inp.wasPressed('KeyE');
  }
  if (usePad && p?.connected) {
    const sx = p.stick[0], sy = p.stick[1]; if (Math.hypot(sx, sy) > 0.05) { out.ax = sx; out.az = sy; }
    const r2 = p.val[PAD.R2] || 0; if (r2 > 0.1 || p.btn[PAD.X]) { out.use = true; out.force = Math.max(r2, p.btn[PAD.X] ? 1 : 0); }
    if (p.btn[PAD.O]) out.use2 = true; if ((p.val[PAD.L2] || 0) > 0.2) out.use2 = out.use2 || false;
    if (p.btn[PAD.L1]) out.steady = true; if ((p.val[PAD.L2] || 0) > 0.3) out.gift = true;
    const slot = wheelSlot(p.rstick[0], p.rstick[1]); if (slot >= 0) { out.tool = WHEEL[slot]; st.wheelShow = 0.6; } else if (Math.abs(p.rstick[0]) > 0.3) out.rot = p.rstick[0];
    if (p.press[PAD.SQ]) out.quick = true; if (p.press[PAD.TRI]) out.keyTag = true; if (p.press[PAD.RIGHT]) out.tbd = 1; if (p.press[PAD.LEFT]) out.tbd = -1;
    if (p.press[PAD.R1]) out.last = true;
  }
  return out;
}
