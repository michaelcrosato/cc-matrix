// Turns keyboard, mouse and pads into per-seat intents and a shared menu navigation state.
import { THREE } from '../../pixel-engine.js';
const { Vector3 } = THREE;

const DEAD = 0.28;
const pads = () => (typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads() || []) : []);
const PAD_KEYS = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, create: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };

export class Router {
  constructor(ctx, game) {
    this.ctx = ctx; this.game = game; this.prev = new Map(); this.padSeat = new Map(); this.seatPad = [null, null, null, null]; this.lastPointer = [0, 0]; this.origin = new Vector3(); this.dir = new Vector3();
    this.nav = this.emptyNav(); this.clickTarget = 0; this.padState = new Map(); this.menuRepeat = { t: 0, key: '' }; this.anyInput = false; this.holdMs = {}; this.rightStick = [0, 0];
    ctx.input.gamepadButtons = {};
    for (const k of ['Tab', 'KeyF', 'AltLeft', 'AltRight', 'Space', 'KeyQ', 'KeyE']) ctx.input.preventKeys.add(k);
    this.wheel = 0;
  }
  emptyNav() { return { up: false, down: false, left: false, right: false, ok: false, back: false, alt1: false, alt2: false, tabPrev: false, tabNext: false, start: false, click: false, rclick: false, any: false, hero: false, map: false, equip: false, skills: false, quests: false }; }
  /** Poll all devices once per rendered frame. */
  poll(dt) {
    const inp = this.ctx.input; const g = this.game; const nav = this.emptyNav(); let any = false; let padAny = false, kbAny = false;
    const ps = pads();
    this.padStates = [];
    for (let i = 0; i < 4; i++) {
      const p = ps[i];
      if (!p || !p.connected) { this.padStates.push(null); continue; }
      const b = (k) => !!(p.buttons[PAD_KEYS[k]] && (p.buttons[PAD_KEYS[k]].pressed || p.buttons[PAD_KEYS[k]].value > 0.5));
      const st = { index: i, lx: p.axes[0] || 0, ly: p.axes[1] || 0, rx: p.axes[2] || 0, ry: p.axes[3] || 0, b: {} };
      for (const k of Object.keys(PAD_KEYS)) st.b[k] = b(k);
      const pv = this.prev.get('pad' + i) || { b: {} };
      st.p = {}; for (const k of Object.keys(PAD_KEYS)) st.p[k] = st.b[k] && !pv.b[k];
      this.prev.set('pad' + i, st); this.padStates.push(st);
      if (Object.values(st.p).some(Boolean) || Math.hypot(st.lx, st.ly) > 0.6 || Math.hypot(st.rx, st.ry) > 0.6) { padAny = true; if (g.glyphs && g.glyphs.device !== 'pad') g.glyphs.device = 'pad'; if (g.audio && !g.audio.unlockedPad) { g.audio.unlockedPad = true; try { this.ctx.audio.unlock(); } catch {} } this.padLastTouched = i; }
    }
    // keyboard / mouse activity
    const kbKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape', 'KeyQ', 'KeyE', 'KeyI', 'KeyC', 'KeyK', 'KeyL', 'KeyM', 'Tab', 'KeyF', 'KeyT', 'MouseLeft', 'MouseRight', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyX', 'KeyV'];
    for (const k of kbKeys) if (inp.wasPressed(k)) kbAny = true;
    const p = inp.pointer; const pdist = Math.hypot(p.x - this.lastPointer[0], p.y - this.lastPointer[1]);
    if (pdist > 0.01) { kbAny = kbAny || true; this.lastPointer = [p.x, p.y]; }
    if (kbAny && !padAny && g.glyphs) g.glyphs.device = 'kbm';
    any = kbAny || padAny;
    // nav from keyboard
    const kp = (...c) => inp.wasPressed(...c);
    nav.up = kp('ArrowUp', 'KeyW'); nav.down = kp('ArrowDown', 'KeyS'); nav.left = kp('ArrowLeft', 'KeyA'); nav.right = kp('ArrowRight', 'KeyD');
    nav.ok = kp('Enter', 'Space'); nav.back = kp('Escape'); nav.alt1 = kp('KeyX'); nav.alt2 = kp('KeyV'); nav.tabPrev = kp('KeyQ'); nav.tabNext = kp('KeyE');
    nav.click = kp('MouseLeft'); nav.rclick = kp('MouseRight');
    nav.hero = kp('KeyI', 'KeyC'); nav.skills = kp('KeyK'); nav.quests = kp('KeyL'); nav.map = kp('KeyM', 'Tab'); nav.equip = kp('KeyF'); nav.start = kp('Escape');
    // pads: first connected pad drives menus (any pad can navigate)
    for (const st of this.padStates) {
      if (!st) continue;
      const rep = this.repeat(st);
      nav.up = nav.up || st.p.up || rep.up; nav.down = nav.down || st.p.down || rep.down; nav.left = nav.left || st.p.left || rep.left; nav.right = nav.right || st.p.right || rep.right;
      nav.ok = nav.ok || st.p.cross; nav.back = nav.back || st.p.circle; nav.alt1 = nav.alt1 || st.p.square; nav.alt2 = nav.alt2 || st.p.triangle; nav.tabPrev = nav.tabPrev || st.p.l1; nav.tabNext = nav.tabNext || st.p.r1;
      const owned = this.game.mode !== 'play' || this.game.seats.some((q) => q.pad === st.index) || this.game.seats.length === 1 && st.index === (this.padStates.find(Boolean) || st).index && !this.game.seats.some((q) => q.pad != null && q.pad !== st.index);
      nav.start = nav.start || (st.p.options && !st.b.create && owned); nav.hero = nav.hero || st.p.create && !st.b.options && owned; nav.map = nav.map || st.p.up && false; nav.equip = nav.equip || false;
    }
    nav.any = any; this.nav = nav; this.anyInput = any;
    this.wheel = inp.wheel; return nav;
  }
  repeat(st) {
    const res = { up: false, down: false, left: false, right: false };
    const dir = st.ly < -0.6 ? 'up' : st.ly > 0.6 ? 'down' : st.lx < -0.6 ? 'left' : st.lx > 0.6 ? 'right' : '';
    const r = (this.menuRepeat[st.index] = this.menuRepeat[st.index] || { dir: '', t: 0 });
    if (dir !== r.dir) { r.dir = dir; r.t = 0; if (dir) res[dir] = true; }
    else if (dir) { r.t += 1 / 60; if (r.t > 0.35) { r.t = 0.2; res[dir] = true; } }
    return res;
  }
  groundBasis() { return this.ctx.camera.groundBasis(); }
  /** Pointer to the ground plane y=0. */
  pointerGround() {
    const inp = this.ctx.input; const p = inp.pointer; if (!p.over) return null;
    this.ctx.camera.rayAt(p.x, p.y, this.origin, this.dir);
    if (Math.abs(this.dir.y) < 1e-4) return null;
    const t = -this.origin.y / this.dir.y; return { x: this.origin.x + this.dir.x * t, z: this.origin.z + this.dir.z * t };
  }
  /** Build the intent for a seat. Seat 0 = keyboard+mouse and the first pad. */
  intent(seat, w, h, state = {}) {
    const inp = this.ctx.input;
    const I = { mx: 0, mz: 0, ax: null, az: null, soft: true, held: [false, false, false, false, false, false], pressed: [false, false, false, false, false, false], dodge: false, potion: false, interact: false, interactHold: false, aimOverride: false };
    const { right, forward } = this.groundBasis();
    const dirFrom = (ax, ay) => { I.mx += right.x * ax + forward.x * ay; I.mz += right.z * ax + forward.z * ay; };
    const ps = this.padStates.filter(Boolean);
    const myPad = ps.find((p) => this.seatPad[seat] === p.index);
    if (seat === (this.game.localSeat ?? 0) || (seat === 0 && this.game.localSeat == null)) {
      let ax = 0, ay = 0;
      if (inp.isDown('KeyW', 'ArrowUp')) ay += 1; if (inp.isDown('KeyS', 'ArrowDown')) ay -= 1; if (inp.isDown('KeyD', 'ArrowRight')) ax += 1; if (inp.isDown('KeyA', 'ArrowLeft')) ax -= 1;
      if (ax || ay) { const l = Math.hypot(ax, ay); dirFrom(ax / l, ay / l); }
      const gp = this.pointerGround();
      const usingPad = this.game.glyphs.device === 'pad';
      if (gp && !usingPad) {
        I.ax = gp.x; I.az = gp.z; I.soft = false;
        // click to move / click on monster
        const shift = inp.isDown('ShiftLeft', 'ShiftRight');
        if (inp.isDown('MouseLeft')) {
          const mon = this.pickMonster(w, gp, state);
          if (mon && mon.team !== 'hero') {
            const d = Math.hypot(mon.x - h.x, mon.z - h.z); I.ax = mon.x; I.az = mon.z;
            const reach = 2.4;
            if (!shift && d > reach && !(h.skills[0] && h.cls === 'lamplighter') && !(h.cls === 'sexton' && d < 8)) { I.mx += (mon.x - h.x) / d; I.mz += (mon.z - h.z) / d; }
            I.held[0] = true; I.pressed[0] = inp.wasPressed('MouseLeft');
          } else {
            const d = Math.hypot(gp.x - h.x, gp.z - h.z);
            if (shift) { I.held[0] = true; I.pressed[0] = inp.wasPressed('MouseLeft'); }
            else if (d > 0.6 && !(ax || ay)) { I.mx += (gp.x - h.x) / d; I.mz += (gp.z - h.z) / d; }
            else if (!(ax || ay)) { I.held[0] = false; }
          }
          I.pressed[0] = I.pressed[0] || false;
        }
      } else if (!usingPad) { I.soft = true; }
      if (inp.isDown('MouseRight')) { I.held[1] = true; I.pressed[1] = inp.wasPressed('MouseRight'); }
      const keys = ['Digit1', 'Digit2', 'Digit3', 'Digit4']; keys.forEach((k, i) => { if (inp.isDown(k)) { I.held[2 + i] = true; I.pressed[2 + i] = inp.wasPressed(k); } });
      I.dodge = inp.wasPressed('Space'); I.potion = inp.wasPressed('KeyQ'); I.interact = inp.wasPressed('KeyE'); I.interactHold = inp.isDown('KeyE');
    }
    const pad = seat === 0 && !myPad ? (this.game.glyphs.device === 'pad' ? ps[0] : null) : myPad;
    if (pad) {
      const lx = Math.abs(pad.lx) > DEAD ? pad.lx : 0, ly = Math.abs(pad.ly) > DEAD ? pad.ly : 0;
      if (lx || ly) dirFrom(lx, -ly);
      const rx = Math.abs(pad.rx) > DEAD ? pad.rx : 0, ry = Math.abs(pad.ry) > DEAD ? pad.ry : 0;
      if (rx || ry) { const aimx = right.x * rx + forward.x * -ry, aimz = right.z * rx + forward.z * -ry; const l = Math.hypot(aimx, aimz) || 1; I.ax = aimx / l; I.az = aimz / l; I.soft = true; I.aimOverride = true; }
      const mapB = { cross: 0, square: 1, triangle: 2, circle: 3, r1: 4, r2: 5 };
      for (const k of Object.keys(mapB)) { if (pad.b[k]) I.held[mapB[k]] = true; if (pad.p[k]) I.pressed[mapB[k]] = true; }
      I.dodge = I.dodge || pad.p.l2; I.potion = I.potion || pad.p.l1;
      if (pad.p.cross) I.interact = true; if (pad.b.cross) I.interactHold = true;
      if (pad.p.down) { I.passingBell = true; }
    }
    const l = Math.hypot(I.mx, I.mz); if (l > 1) { I.mx /= l; I.mz /= l; }
    I.moving = l > 0.05;
    return I;
  }
  pickMonster(w, gp, state) {
    // monster whose chest projects within 14 art pixels of the pointer
    let best = null, bd = 14; const cam = this.ctx.camera.camera; const v = this.tmp || (this.tmp = new Vector3()); const hud = this.ctx.hud; const p = this.ctx.input.pointer;
    const px = ((p.x + 1) / 2) * hud.width, py = (1 - (p.y + 1) / 2) * hud.height;
    for (const m of w.monsters) { if (m.dead || m.team === 'hero' || m.prop && false) continue; v.set(m.x, 0.8 * (m.scale || 1), m.z).project(cam); const sx = ((v.x + 1) / 2) * hud.width, sy = (1 - (v.y + 1) / 2) * hud.height; const d = Math.hypot(sx - px, sy - py); if (d < bd) { bd = d; best = m; } }
    return best;
  }
}
