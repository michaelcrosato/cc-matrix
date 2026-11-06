// All input becomes intents and menu actions. Pad state travels through ctx.input.send so replays stay valid.
import { interactTarget } from '../sim/step.js';

const ALL_KEYS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c) => `Key${c}`).concat([...'0123456789'].map((c) => `Digit${c}`), ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape', 'Tab', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'Backspace']);
export const STICK_DEAD = 0.22;
const RIGHT = [0.7071, -0.7071]; const UP = [-0.7071, -0.7071]; // Screen axes on the ground (iso yaw 45).
const B = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, create: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };
export { B as PAD };
const blank = () => ({ b: 0, a: [0, 0, 0, 0], prev: 0 });
const has = (p, i) => (p.b & (1 << i)) !== 0;
const was = (p, i) => (p.prev & (1 << i)) !== 0;

export class Router {
  constructor(ctx, game) {
    this.ctx = ctx; this.game = game; this.pads = [blank(), blank(), blank(), blank()]; this.lastSent = ['', '', '', ''];
    this.padSeat = [-1, -1, -1, -1]; this.seatPad = [-1, -1, -1, -1]; this.lastDevice = 'kbm';
    this.latch = [{}, {}, {}, {}]; this.crossDown = [0, 0, 0, 0]; this.crossSent = [false, false, false, false]; this.crossBlock = [false, false, false, false]; this.createT = [0, 0, 0, 0]; this.createChord = [false, false, false, false];
    this.pointerPrev = { x: 0, y: 0 }; this.pointerMoved = false; this.anyInput = false; this.menu = this.blankMenu(); this.click = null; this.rclick = false; this.wheel = 0; this.dirT = {}; this.goal = null; this.aimPoint = { x: 0, z: 0 }; this.origin = new (game.THREE.Vector3)(); this.dir = new (game.THREE.Vector3)(); this.seenPads = 0; this.seatDevice = ['kbm', 'pad', 'pad', 'pad']; this.cycle = [0, 0, 0, 0]; this.showLabels = false; this.pathT = 0; this.bellHeld = [0, 0, 0, 0]; this.menuSeat = 0; this.joinRequests = [];
    if (ctx.input.gamepadButtons) ctx.input.gamepadButtons = {};
    ctx.input.gamepadLookSpeed = 0; ctx.input.gamepadDeadzone = 1;
    for (const k of ['Tab', 'AltLeft', 'AltRight', 'F1', 'F2', 'F3', 'F5', 'KeyF', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Enter', 'Escape']) ctx.input.preventKeys.add(k);
  }
  blankMenu() { return { up: false, down: false, left: false, right: false, confirm: false, back: false, x: false, y: false, tabL: false, tabR: false, pause: false, seat: 0, holdConfirm: false, holdBack: false }; }
  // Read each physical pad and forward its state. Pads never touch the sim directly.
  pollPads() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const list = navigator.getGamepads();
    for (let i = 0; i < 4; i++) {
      const gp = list?.[i]; if (!gp || !gp.connected) { if (this.lastSent[i] !== '') { this.lastSent[i] = ''; this.ctx.input.send({ pad: i, b: 0, a: [0, 0, 0, 0], gone: true }); } continue; }
      let b = 0; const n = Math.min(16, gp.buttons.length);
      for (let k = 0; k < n; k++) { const bt = gp.buttons[k]; if (bt && (bt.pressed || bt.value > 0.5)) b |= 1 << k; }
      const q = (v) => { const d = Math.abs(v ?? 0) < STICK_DEAD ? 0 : v; return Math.round(d * 20) / 20; };
      const a = [q(gp.axes[0]), q(gp.axes[1]), q(gp.axes[2]), q(gp.axes[3])];
      const key = `${b}|${a.join(',')}`;
      if (key !== this.lastSent[i]) { this.lastSent[i] = key; this.ctx.input.send({ pad: i, b, a }); }
    }
  }
  frame(commands) {
    const inp = this.ctx.input; const m = this.blankMenu();
    this.anyInput = false; this.click = null; this.rclick = false; this.wheel = inp.wheel; inp.wheel = 0;
    for (const p of this.pads) p.prev = p.b;
    this.pollPads();
    for (const c of commands) if (c && c.pad !== undefined) { const p = this.pads[c.pad]; p.b = c.b; p.a = c.a; if (c.gone && this.padSeat[c.pad] >= 0) this.game.padGone?.(c.pad); if (!c.gone && c.b) { if (this.ctx.audio && !this.ctx.audio.unlocked) this.ctx.audio.unlock(); } }
    // Pads: menu edges and device tracking.
    for (let i = 0; i < 4; i++) {
      const p = this.pads[i];
      const stickActive = Math.abs(p.a[0]) + Math.abs(p.a[1]) + Math.abs(p.a[2]) + Math.abs(p.a[3]) > 0;
      if (p.b !== 0 || stickActive) { if (p.b !== p.prev || stickActive) { this.lastDevice = 'pad'; this.anyInput = true; } this.seenPads |= 1 << i; }
      const seat = this.padSeat[i];
      if (seat < 0 && (p.b & ~p.prev) !== 0) {
        if (this.seatPad[0] < 0) this.assign(i, 0);
        else if (has(p, B.options) && !was(p, B.options) && !has(p, B.create)) { this.joinRequests.push(i); continue; }
        else if (this.game.seatsOpenForMenu?.()) { this.assign(i, this.seatPad.findIndex((q) => q < 0)); }
      }
      const s = this.padSeat[i]; if (s < 0) continue;
      if (this.game.menuOwner !== null && this.game.menuOwner !== undefined && this.game.menuOwner !== s) continue;
      const press = (k) => has(p, k) && !was(p, k);
      if (press(B.cross)) { m.confirm = true; m.seat = s; }
      if (press(B.circle)) { m.back = true; m.seat = s; }
      if (press(B.square)) { m.x = true; m.seat = s; }
      if (press(B.triangle)) { m.y = true; m.seat = s; }
      if (press(B.l1)) m.tabL = true; if (press(B.r1)) m.tabR = true;
      if (press(B.options) && !has(p, B.create)) { m.pause = true; m.seat = s; }
      if (has(p, B.cross)) m.holdConfirm = true; if (has(p, B.circle)) m.holdBack = true;
      this.padDirs(p, m, i);
    }
    // Keyboard and mouse.
    const anyKey = inp.queuedPresses.length > 0 || inp.anyDown(ALL_KEYS);
    const ptr = inp.pointer; const pm = Math.hypot(ptr.x - this.pointerPrev.x, ptr.y - this.pointerPrev.y); const hud = this.ctx.hud;
    this.pointerMoved = false;
    if (pm * Math.max(hud.width, 1) * 2 > 2 * 0.5 && !ptr.touch) { this.pointerMoved = true; this.pointerPrev.x = ptr.x; this.pointerPrev.y = ptr.y; this.lastDevice = 'kbm'; this.anyInput = true; }
    if (anyKey) { this.lastDevice = 'kbm'; this.anyInput = true; }
    const wp = (...k) => inp.wasPressed(...k);
    if (wp('Enter')) m.confirm = true;
    if (wp('Space')) m.confirm = true;
    if (wp('Escape')) { m.back = true; m.pause = true; }
    if (wp('KeyX')) m.x = true; if (wp('KeyV')) m.y = true;
    if (wp('KeyQ')) m.tabL = true; if (wp('KeyE')) m.tabR = true;
    const repeatKey = (name, down, dt = 1 / 60) => { if (down) { this.dirT[name] = (this.dirT[name] ?? -0.0) - dt; if (this.dirT[name] <= 0) { m[name] = true; this.dirT[name] = this.dirHeld?.[name] ? 0.12 : 0.32; (this.dirHeld ??= {})[name] = true; } } else { this.dirT[name] = 0; if (this.dirHeld) this.dirHeld[name] = false; } };
    repeatKey('up', inp.isDown('ArrowUp', 'KeyW')); repeatKey('down', inp.isDown('ArrowDown', 'KeyS')); repeatKey('left', inp.isDown('ArrowLeft', 'KeyA')); repeatKey('right', inp.isDown('ArrowRight', 'KeyD'));
    for (const e of inp.buttonEvents) {
      if (!e.down) continue;
      if (e.code === 'MouseLeft') this.click = { x: e.x, y: e.y };
      if (e.code === 'MouseRight') this.rclick = true;
      if (e.code !== 'Touch') { this.lastDevice = 'kbm'; this.anyInput = true; }
    }
    if (inp.wasPressed('MouseLeft') && !this.click) { this.click = { x: ptr.x, y: ptr.y }; this.lastDevice = 'kbm'; this.anyInput = true; }
    if (inp.wasPressed('MouseRight')) { this.rclick = true; this.lastDevice = 'kbm'; this.anyInput = true; }
    if (this.wheel) { this.anyInput = true; }
    if (inp.wasPressed('Touch')) { this.touched = true; } else this.touched = false;
    this.menu = m;
    this.showLabels = inp.isDown('AltLeft', 'AltRight') || this.pads.some((p) => has(p, B.r3));
  }
  padDirs(p, m, i) {
    const repeat = (name, on) => { const k = `${name}${i}`; if (on) { this.dirT[k] = (this.dirT[k] ?? 0) - 1 / 60; if (this.dirT[k] <= 0) { m[name] = true; this.dirT[k] = this.dirHeld?.[k] ? 0.12 : 0.32; (this.dirHeld ??= {})[k] = true; } } else { this.dirT[k] = 0; if (this.dirHeld) this.dirHeld[k] = false; } };
    repeat('up', has(p, B.up) || p.a[1] < -0.5); repeat('down', has(p, B.down) || p.a[1] > 0.5); repeat('left', has(p, B.left) || p.a[0] < -0.5); repeat('right', has(p, B.right) || p.a[0] > 0.5);
  }
  // A press that closed a menu must not also act in the world.
  swallow() { this.edges ??= [{}, {}, {}, {}]; for (let i = 0; i < 4; i++) { for (let k = 0; k < 16; k++) this.edges[i][k] = has(this.pads[i], k); const s = this.padSeat[i]; if (s >= 0 && has(this.pads[i], B.cross)) { this.crossBlock[s] = true; this.crossSent[s] = true; } } this.goal = null; }
  assign(pad, seat) { if (seat < 0) return; this.padSeat[pad] = seat; this.seatPad[seat] = pad; this.seatDevice[seat] = 'pad'; }
  release(pad) { const s = this.padSeat[pad]; if (s >= 0) this.seatPad[s] = -1; this.padSeat[pad] = -1; }
  padsSeen() { let n = 0; for (let i = 0; i < 4; i++) if (this.seenPads & (1 << i)) n++; return n; }
  // Mouse on the ground plane.
  groundAt(x, y) {
    const cam = this.ctx.camera; cam.rayAt(x, y, this.origin, this.dir);
    if (Math.abs(this.dir.y) < 1e-4) return { x: 0, z: 0 };
    const t = -this.origin.y / this.dir.y; return { x: this.origin.x + this.dir.x * t, z: this.origin.z + this.dir.z * t };
  }
  // In-world mouse: what's under the pointer, and what clicking it means.
  pickWorld(w, view, seat) {
    const inp = this.ctx.input; const ptr = inp.pointer; const hud = this.ctx.hud;
    const px = ((ptr.x + 1) / 2) * hud.width; const py = ((1 - ptr.y) / 2) * hud.height;
    let best = null; let bd = 14;
    for (const m of w.active ?? w.monsters) { if (m.dead || m.dormant || m.untargetable) continue; const p = view.project(m.x, 0.8 * (m.scale ?? 1), m.z, hud); const d = Math.hypot(p.x - px, p.y - py); const mr = 14 * Math.max(1, (m.r ?? 0.4) / 0.42); if (d < mr && d < bd + mr - 14) { bd = d; best = m; } }
    this.hoverMonster = best;
    let prop = null; let pd = 16;
    for (const p of w.props) { if (!p.interact || p.used || p.hidden || !view.propsV.get(p.id)) continue; if (!view.propsV.get(p.id).obj?.visible && !view.propsV.get(p.id).actor?.root.visible) continue; const s = view.project(p.x, 0.9, p.z, hud); const d = Math.hypot(s.x - px, s.y - py); if (d < pd) { pd = d; prop = p; } }
    this.hoverProp = prop;
    let brk = null; for (const p of w.props) { if (p.kind !== 'breakable' || p.broken) continue; const s = view.project(p.x, 0.5, p.z, hud); if (Math.hypot(s.x - px, s.y - py) < 8) { brk = p; break; } } this.hoverBreak = brk;
  }
  // Called once per fixed step, per local seat.
  intentFor(seat, w, view, hero = null) {
    const it = { moveX: 0, moveZ: 0, pressed: this.latch[seat], held: {} }; this.latch[seat] = {};
    const pad = this.seatPad[seat]; const h = hero ?? w.heroes.find((q) => q.seat === seat);
    if (!h) return it;
    if (seat === 0) this.keyboardIntent(it, h, w, view);
    if (pad >= 0) this.padIntent(it, this.pads[pad], pad, seat, h, w);
    return it;
  }
  keyboardIntent(it, h, w, view) {
    const inp = this.ctx.input; const mv = inp.moveAxis();
    const padUsed = this.lastDevice === 'pad';
    let x = 0; let y = 0;
    if (inp.isDown('KeyA', 'ArrowLeft')) x -= 1; if (inp.isDown('KeyD', 'ArrowRight')) x += 1; if (inp.isDown('KeyW', 'ArrowUp')) y += 1; if (inp.isDown('KeyS', 'ArrowDown')) y -= 1;
    mv; if (x || y) { this.goal = null; const L = Math.hypot(x, y); it.moveX = (RIGHT[0] * x + UP[0] * y) / L; it.moveZ = (RIGHT[1] * x + UP[1] * y) / L; }
    const P = (c) => inp.consumePress(c);
    if (P('Space')) it.pressed.dodge = true; if (P('KeyQ')) it.pressed.potion = true;
    if (P('Digit1')) it.pressed.s2 = true; if (P('Digit2')) it.pressed.s3 = true; if (P('Digit3')) it.pressed.s4 = true; if (P('Digit4')) it.pressed.s5 = true;
    if (inp.isDown('Digit1')) it.held.s2 = true; if (inp.isDown('Digit2')) it.held.s3 = true; if (inp.isDown('Digit3')) it.held.s4 = true; if (inp.isDown('Digit4')) it.held.s5 = true;
    if (P('KeyE')) { it.pressed.interact = true; } if (inp.isDown('KeyE')) it.held.interact = true;
    if (P('KeyF')) this.game.command?.({ c: 'equipNewest' }, 0);
    if (inp.isDown('KeyT')) { this.bellHeld[0] += 1 / 60; if (this.bellHeld[0] >= 1.5) { this.bellHeld[0] = -99; this.game.command?.({ c: 'bell' }, 0); } } else this.bellHeld[0] = 0;
    if (padUsed) return;
    const ptr = inp.pointer; const g = this.groundAt(ptr.x, ptr.y); this.aimPoint = g;
    const dx = g.x - h.x; const dz = g.z - h.z; const d = Math.hypot(dx, dz) || 1; it.aimX = dx / d; it.aimZ = dz / d; it.tx = g.x; it.tz = g.z; it.hardAim = true;
    this.pickWorld(w, view, 0);
    const shift = inp.isDown('ShiftLeft', 'ShiftRight');
    const left = inp.isDown('MouseLeft'); const leftPressed = inp.consumePress('MouseLeft');
    if (inp.isDown('MouseRight')) it.held.s1 = true; if (inp.consumePress('MouseRight')) it.pressed.s1 = true;
    if (shift && left) { it.held.s0 = true; if (leftPressed) it.pressed.s0 = true; this.goal = null; }
    else if (leftPressed) {
      if (this.hoverMonster) this.goal = { kind: 'monster', id: this.hoverMonster.id };
      else if (this.hoverProp) this.goal = { kind: 'prop', id: this.hoverProp.id };
      else if (this.hoverBreak) this.goal = { kind: 'break', id: this.hoverBreak.id };
      else this.goal = { kind: 'ground', x: g.x, z: g.z, hold: true };
      this.path = null;
    } else if (left && this.goal?.kind === 'ground') { this.goal.x = g.x; this.goal.z = g.z; }
    if (!left && this.goal?.hold) this.goal.hold = false;
    this.followGoal(it, h, w);
  }
  followGoal(it, h, w) {
    const go = this.goal; if (!go) return;
    let tx = go.x; let tz = go.z; let stop = 0.35;
    if (go.kind === 'monster') {
      const m = w.monsters.find((q) => q.id === go.id); if (!m || m.dead) { this.goal = null; return; }
      tx = m.x; tz = m.z; it.tx = tx; it.tz = tz; const d = Math.hypot(tx - h.x, tz - h.z) || 1; it.aimX = (tx - h.x) / d; it.aimZ = (tz - h.z) / d;
      const reach = this.skillReach(h, 0);
      if (d <= reach + (m.r ?? 0.4)) { it.held.s0 = true; it.pressed.s0 = true; if (!this.ctx.input.isDown('MouseLeft')) this.goal = null; return; }
    } else if (go.kind === 'prop') {
      const p = w.props.find((q) => q.id === go.id); if (!p || p.used) { this.goal = null; return; } tx = p.x; tz = p.z;
      if (Math.hypot(tx - h.x, tz - h.z) < 2) { it.interactId = p.id; it.pressed.interact = true; it.held.interact = true; if (!p.hold) this.goal = null; return; }
    } else if (go.kind === 'break') {
      const p = w.props.find((q) => q.id === go.id); if (!p || p.broken) { this.goal = null; return; } tx = p.x; tz = p.z; const d = Math.hypot(tx - h.x, tz - h.z) || 1; it.aimX = (tx - h.x) / d; it.aimZ = (tz - h.z) / d;
      if (d <= this.skillReach(h, 0)) { it.pressed.s0 = true; this.goal = null; return; }
    }
    const d0 = Math.hypot(tx - h.x, tz - h.z);
    if (d0 < stop) { if (!go.hold) this.goal = null; return; }
    // Straight when possible, else the nav path.
    let dx = (tx - h.x) / d0; let dz = (tz - h.z) / d0;
    if (!w.zone.nav.lineOfSight(h.x, h.z, tx, tz, 0.3)) {
      this.pathT -= 1 / 60;
      if (!this.path || this.pathT <= 0) { this.path = w.zone.nav.path([h.x, 0, h.z], [tx, 0, tz]); this.pathT = 0.4; this.pathI = 1; }
      if (this.path) { while (this.pathI < this.path.length - 1 && Math.hypot(this.path[this.pathI][0] - h.x, this.path[this.pathI][2] - h.z) < 0.5) this.pathI++; const p = this.path[Math.min(this.pathI, this.path.length - 1)]; const dd = Math.hypot(p[0] - h.x, p[2] - h.z) || 1; dx = (p[0] - h.x) / dd; dz = (p[2] - h.z) / dd; } else { if (!go.hold) this.goal = null; return; }
    }
    it.moveX = dx; it.moveZ = dz;
  }
  skillReach(h, slot) { const s = h.slots[slot]?.skill; if (!s) return 2.5; const sk = this.game.SKILLS[s]; const op = sk.fx[0]; return op.range ?? op.radius ?? sk.range ?? 3; }
  padIntent(it, p, pad, seat, h, w) {
    const lx = p.a[0]; const ly = p.a[1]; const rx = p.a[2]; const ry = p.a[3];
    if (Math.hypot(lx, ly) > 0.15) { it.moveX += RIGHT[0] * lx + UP[0] * -ly; it.moveZ += RIGHT[1] * lx + UP[1] * -ly; }
    if (Math.hypot(rx, ry) > 0.25) { const ax = RIGHT[0] * rx + UP[0] * -ry; const az = RIGHT[1] * rx + UP[1] * -ry; const L = Math.hypot(ax, az) || 1; it.aimX = ax / L; it.aimZ = az / L; it.hardAim = true; const r = 7; it.tx = h.x + it.aimX * r; it.tz = h.z + it.aimZ * r; }
    else if (Math.hypot(it.moveX, it.moveZ) > 0.2) { const L = Math.hypot(it.moveX, it.moveZ); it.aimX = it.moveX / L; it.aimZ = it.moveZ / L; }
    else { it.aimX = Math.sin(h.facing); it.aimZ = Math.cos(h.facing); }
    if (it.hardAim !== true) { delete it.tx; delete it.tz; }
    const M = [[B.square, 's1'], [B.triangle, 's2'], [B.circle, 's3'], [B.r1, 's4'], [B.r2, 's5']];
    for (const [k, name] of M) if (has(p, k)) it.held[name] = true;
    for (const [k, name] of M) if (this.edge(p, pad, k)) it.pressed[name] = true;
    if (this.edge(p, pad, B.l2)) it.pressed.dodge = true; if (this.edge(p, pad, B.l1)) it.pressed.potion = true;
    // Cross: interact on a tap with something near and nothing hostile; hold always interacts; otherwise attack.
    const target = interactTarget(w, h, this.cycle[seat]); const hostile = (w.active ?? []).some((m) => !m.dead && Math.hypot(m.x - h.x, m.z - h.z) < 4);
    if (this.crossBlock[seat] && has(p, B.cross)) { /* still held from a menu */ }
    else if (has(p, B.cross)) {
      this.crossDown[seat] += 1 / 60;
      if (target && !hostile && !this.crossSent[seat]) { it.pressed.interact = true; this.crossSent[seat] = true; }
      if (this.crossDown[seat] >= 0.4 && target) { it.held.interact = true; if (!this.crossSent[seat]) { it.pressed.interact = true; this.crossSent[seat] = true; } }
      if (!target || hostile) { if (this.crossDown[seat] < 0.4 || !target) { it.held.s0 = true; if (this.edge(p, pad, B.cross)) it.pressed.s0 = true; } }
      if (target?.hold) it.held.interact = true;
    } else { this.crossDown[seat] = 0; this.crossSent[seat] = false; this.crossBlock[seat] = false; }
    it.cycle = this.cycle[seat];
    if (this.edge(p, pad, B.right)) this.cycle[seat]++;
    if (this.edge(p, pad, B.left)) this.game.command?.({ c: 'equipNewest' }, seat);
    if (has(p, B.down)) { this.bellHeld[seat] += 1 / 60; if (this.bellHeld[seat] >= 1.5) { this.bellHeld[seat] = -99; this.game.command?.({ c: 'bell' }, seat); } } else if (seat > 0 || !this.ctx.input.isDown('KeyT')) this.bellHeld[seat] = 0;
  }
  // A press seen between fixed steps. Edges are read off the state that arrived this frame.
  edge(p, pad, k) { this.edges ??= [{}, {}, {}, {}]; const prev = this.edges[pad][k] ?? false; const now = has(p, k); this.edges[pad][k] = now; return now && !prev; }
  padPress(pad, k) { const p = this.pads[pad]; return has(p, k) && !was(p, k); }
  padRelease(pad, k) { const p = this.pads[pad]; return !has(p, k) && was(p, k); }
  padHeld(pad, k) { return has(this.pads[pad], k); }
}
