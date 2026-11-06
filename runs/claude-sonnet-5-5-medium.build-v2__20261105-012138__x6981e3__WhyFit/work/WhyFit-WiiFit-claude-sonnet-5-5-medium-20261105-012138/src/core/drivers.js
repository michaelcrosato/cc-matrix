// Drivers: one seam for local input, pads, bots and ghosts. read(out) fills { x, y, breath, stepL, stepR, confirm }.
import { held, consume } from './actions.js';
import { T } from './tunables.js';

const clamp1 = (o) => { const d = Math.hypot(o.x, o.y); if (d > 1) { o.x /= d; o.y /= d; } };
export const blank = () => ({ x: 0, y: 0, breath: false, stepL: false, stepR: false, confirm: false, half: false });

export const SKILLS = {
  idle: null,
  sloppy: { tau: 0.42, kp: 0.7, kd: 0.12, err: 1.3 },
  average: { tau: 0.3, kp: 1.1, kd: 0.35, err: 0.8 },
  good: { tau: 0.22, kp: 1.5, kd: 0.55, err: 0.45 },
  expert: { tau: 0.17, kp: 1.9, kd: 0.7, err: 0.2 },
};
export const SKILL_NAMES = ['idle', 'sloppy', 'average', 'good', 'expert'];

export class LocalDriver {
  kind = 'local';
  kx = 0; ky = 0;
  constructor(app) { this.app = app; this.dial = { x: 240, y: 56 }; }
  read(out, ctx, dt = 1 / 60) {
    const input = ctx.input, dev = this.app.device;
    // keyboard smoothed: attack .10 s, release .06 s
    const half = held(input, 'half') ? 0.5 : 1;
    const tx = ((input.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (input.isDown('KeyA', 'ArrowLeft') ? 1 : 0) + (input.isDown('PadRight') ? 1 : 0) - (input.isDown('PadLeft') ? 1 : 0)) * half;
    const ty = ((input.isDown('KeyW', 'ArrowUp') ? 1 : 0) - (input.isDown('KeyS', 'ArrowDown') ? 1 : 0) + (input.isDown('PadUp') ? 1 : 0) - (input.isDown('PadDown') ? 1 : 0)) * half;
    const rate = (a, b) => (Math.abs(b) > Math.abs(a) ? dt / 0.1 : dt / 0.06);
    this.kx += (tx - this.kx) * Math.min(1, rate(this.kx, tx)); this.ky += (ty - this.ky) * Math.min(1, rate(this.ky, ty));
    let x = this.kx, y = this.ky;
    const pa = input.padAxis;
    if (dev.last === 'mouse' && ctx.hud) {
      const p = input.pointer, hud = ctx.hud;
      const ax = (p.x + 1) / 2 * hud.width, ay = (1 - p.y) / 2 * hud.height;
      this.mx = (ax - this.dial.x) / T.mouseLeanRadius; this.my = -(ay - this.dial.y) / T.mouseLeanRadius;
      x = this.mx; y = this.my;
    } else if (Math.hypot(pa.x, pa.y) > 0.02) { x = pa.x; y = pa.y; }
    out.x = x; out.y = y; clamp1(out);
    out.breath = held(input, 'breath'); out.half = half < 1;
    out.stepL = consume(input, 'footL'); out.stepR = consume(input, 'footR');
    out.confirm = consume(input, 'confirm') || input.consumePress('MouseLeft');
    return out;
  }
}

const padOf = (i) => (typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads()[i] : null);
export function deadzone(x, y, dz = 0.12) { const m = Math.hypot(x, y); if (m < dz) return [0, 0]; const s = Math.min(1, (m - dz) / (1 - dz)) / m; return [x * s, y * s]; }
export class PadDriver {
  kind = 'pad';
  constructor(index) { this.index = index; this.prev = []; }
  read(out) {
    const p = padOf(this.index);
    out.x = out.y = 0; out.breath = out.stepL = out.stepR = out.confirm = false;
    if (!p) return out;
    const [x, y] = deadzone(p.axes[0] ?? 0, -(p.axes[1] ?? 0));
    out.x = x; out.y = y;
    const b = (i) => !!p.buttons[i]?.pressed;
    const edge = (i) => { const r = b(i) && !this.prev[i]; return r; };
    out.breath = b(7) || b(0);
    out.stepL = edge(4) || edge(6); out.stepR = edge(5) || edge(7);
    out.confirm = edge(0);
    for (let i = 0; i < 17; i++) this.prev[i] = b(i);
    return out;
  }
}

// Delayed PD controller toward a target. The same bot plays classmates, attract mode and the tests.
export class BotDriver {
  kind = 'bot';
  constructor(skill = 'average', rand = Math.random) {
    this.skill = skill; this.rand = rand;
    this.hist = []; this.dx = 0; this.dy = 0;
    this.tx = 0; this.ty = 0; this.walk = true;
    this.extra = {}; // activity sets { breath, stepL, stepR, confirm }
    this.gain = 1;
  }
  observe(dot, t) {
    this.hist.push({ t, x: dot.x, y: dot.y, vx: dot.vx, vy: dot.vy });
    while (this.hist.length > 80) this.hist.shift();
  }
  seen(t, tau) {
    for (let i = this.hist.length - 1; i >= 0; i--) if (this.hist[i].t <= t - tau) return this.hist[i];
    return this.hist[0] ?? { x: 0, y: 0, vx: 0, vy: 0 };
  }
  read(out, ctx, dt = 1 / 60, t = 0) {
    const s = SKILLS[this.skill];
    Object.assign(out, { breath: false, stepL: false, stepR: false, confirm: false }, this.extra);
    if (!s) { out.x = out.y = 0; return out; }
    const sn = this.seen(t, s.tau);
    this.dx += (this.rand() - 0.5) * s.err * dt * 6; this.dy += (this.rand() - 0.5) * s.err * dt * 6;
    this.dx *= 0.995; this.dy *= 0.995;
    out.x = -s.kp * (sn.x - this.tx) - s.kd * sn.vx + this.dx;
    out.y = -s.kp * (sn.y - this.ty) - s.kd * sn.vy + this.dy;
    clamp1(out);
    return out;
  }
}

export class GhostDriver {
  kind = 'ghost';
  constructor() { this.x = 0; this.y = 0; this.c = 0; this.t = 0; this.s = 0; this.a = -1; this.seen = false; this.left = false; this.tx = 0; this.ty = 0; }
  push(m) { this.tx = m.x ?? 0; this.ty = m.y ?? 0; this.c = m.c ?? 0; this.t = m.t ?? 0; this.s = m.s ?? 0; this.a = m.a ?? -1; this.seen = true; }
  lerp(k) { this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; }
  read(out) { out.x = out.y = 0; out.breath = out.stepL = out.stepR = out.confirm = false; return out; }
}
