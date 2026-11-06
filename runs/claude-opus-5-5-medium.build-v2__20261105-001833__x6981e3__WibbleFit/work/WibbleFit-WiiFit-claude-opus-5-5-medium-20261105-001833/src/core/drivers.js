// One seam for who is moving a lane: the local player, a pad by index, a bot, or a ghost.
import { applyDeadzone } from '../../pixel-engine.js';
import { ACTIONS } from './actions.js';
import { T } from './tunables.js';

export const SKILLS = {
  sloppy: { tau: 0.42, kp: 0.7, kd: 0.12, err: 1.3, name: 'sloppy', hit: 0.45, head: 0.3, jitter: 0.11, circle: 1.0, repErr: 0.4, repLead: -0.3, catch: 0.05, mistake: 0.3 },
  average: { tau: 0.30, kp: 1.1, kd: 0.35, err: 0.8, name: 'average', hit: 0.8, head: 0.45, jitter: 0.07, circle: 1.1, repErr: 0.2, repLead: -0.1, catch: 0.15, mistake: 0.15 },
  good: { tau: 0.22, kp: 1.5, kd: 0.55, err: 0.45, name: 'good', hit: 0.95, head: 0.85, jitter: 0.04, circle: 1.5, repErr: 0.09, repLead: 0.05, catch: 0.6, mistake: 0.05 },
  expert: { tau: 0.17, kp: 1.9, kd: 0.7, err: 0.2, name: 'expert', hit: 1, head: 1, jitter: 0.018, circle: 1.75, repErr: 0.035, repLead: 0.13, catch: 0.97, mistake: 0 },
};
export const blankInput = () => ({ x: 0, y: 0, breath: false, stepL: false, stepR: false, confirm: false, digital: false, axisKeys: 0 });
export const clear = (o) => { o.x = 0; o.y = 0; o.breath = false; o.stepL = false; o.stepR = false; o.confirm = false; o.digital = false; return o; };
export const clampDisc = (o) => { const d = Math.hypot(o.x, o.y); if (d > 1) { o.x /= d; o.y /= d; } return o; };

// The delayed PD controller: the same brain for classmates, attract and tests.
export class BotBrain {
  hist = []; dx = 0; dy = 0;
  constructor(skill, rng) { this.skill = skill; this.rng = rng; }
  lean(state, tx, ty, dt, out) {
    const s = this.skill;
    this.hist.push({ x: state.x, y: state.y, vx: state.vx, vy: state.vy });
    const lag = Math.max(1, Math.round(s.tau / dt));
    while (this.hist.length > lag + 1) this.hist.shift();
    const seen = this.hist[0];
    this.dx += (this.rng.next() - 0.5) * s.err * dt * 6; this.dx *= 0.995;
    this.dy += (this.rng.next() - 0.5) * s.err * dt * 6; this.dy *= 0.995;
    out.x = -s.kp * (seen.x - tx) - s.kd * seen.vx + this.dx;
    out.y = -s.kp * (seen.y - ty) - s.kd * seen.vy + this.dy;
    return clampDisc(out);
  }
}
export class IdleDriver { kind = 'idle'; read(o) { return clear(o); } }
export class BotDriver {
  kind = 'bot';
  constructor(skillName, rng) { this.skillName = skillName; this.skill = SKILLS[skillName]; this.rng = rng; this.brain = new BotBrain(this.skill, rng); }
  read(o, sim, dt) { clear(o); sim?.bot?.(this, o, dt); return o; }
}
export function makeDriver(name, rng) { return name === 'idle' ? new IdleDriver() : new BotDriver(name, rng); }

// Keyboard smoothing state plus the mouse: the same game on the same screens.
export class LocalDriver {
  kind = 'local'; sx = 0; sy = 0;
  constructor(env, { kbOnly = false, noPad = false } = {}) { this.env = env; this.kbOnly = kbOnly; this.noPad = noPad; }
  read(o, sim, dt) {
    const { input, device } = this.env; clear(o);
    if (this.env.blocked?.()) return o;
    const pad = this.noPad || this.kbOnly ? { x: 0, y: 0 } : input.padAxis;
    const padOn = Math.hypot(pad.x, pad.y) > 0.02;
    const kx = (input.anyDown(['KeyD', 'ArrowRight']) ? 1 : 0) - (input.anyDown(['KeyA', 'ArrowLeft']) ? 1 : 0);
    const ky = (input.anyDown(['KeyW', 'ArrowUp']) ? 1 : 0) - (input.anyDown(['KeyS', 'ArrowDown']) ? 1 : 0);
    const half = input.anyDown(['ShiftLeft', 'ShiftRight']) ? 0.5 : 1;
    const norm = kx && ky ? Math.SQRT1_2 : 1;
    const gx = kx * norm * half, gy = ky * norm * half;
    const rate = (g, s) => Math.min(1, dt / (Math.abs(g) > Math.abs(s) ? 0.10 : 0.06));
    this.sx += (gx - this.sx) * rate(gx, this.sx); this.sy += (gy - this.sy) * rate(gy, this.sy);
    if (padOn) { o.x = pad.x; o.y = pad.y; }
    else if (kx || ky || Math.abs(this.sx) > 0.02 || Math.abs(this.sy) > 0.02) { o.x = this.sx; o.y = this.sy; o.digital = !!(kx || ky); o.axisKeys = ky; o.keyX = kx; o.keyY = ky; o.isKeys = true; }
    else if (!this.kbOnly && device.last === 'mouse') {
      const m = this.env.mouseLean?.(); if (m) { o.x = m.x; o.y = m.y; }
    }
    if (!o.isKeys) { o.keyX = 0; o.keyY = 0; }
    o.isKeys = !!(kx || ky);
    const pads = this.kbOnly ? (c) => !c.startsWith('Pad') && !c.startsWith('Mouse') : () => true;
    o.breath = input.anyDown(ACTIONS.breath.filter(pads));
    o.stepL = input.consumeAny(ACTIONS.stepL.filter(pads));
    o.stepR = input.consumeAny(ACTIONS.stepR.filter(pads));
    o.confirm = input.consumeAny(ACTIONS.confirm.filter(pads).concat(this.kbOnly ? [] : ['MouseLeft']));
    return clampDisc(o);
  }
}
// One physical pad, for Family Hour. The engine merges pads, so lanes read them by index.
export class PadDriver {
  kind = 'pad'; prev = [];
  constructor(index) { this.index = index; }
  read(o) {
    clear(o);
    const p = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads()[this.index] : null;
    if (!p) return o;
    const a = applyDeadzone(p.axes[0] ?? 0, -(p.axes[1] ?? 0), 0.12);
    o.x = a.x; o.y = a.y;
    const down = (i) => !!p.buttons[i]?.pressed;
    const edge = (i) => down(i) && !this.prev[i];
    o.breath = down(7) || down(0);
    o.stepL = edge(4) || edge(6); o.stepR = edge(5) || edge(7);
    o.confirm = edge(0);
    this.prev = p.buttons.map((b) => !!b.pressed);
    return clampDisc(o);
  }
}
// Display only: never simulates. Receivers lerp toward what was last sent.
export class GhostDriver {
  kind = 'ghost'; x = 0; y = 0; tx = 0; ty = 0; c = 0; t = 0; s = 0; a = -1; seen = false;
  receive(d) { this.tx = d.x ?? 0; this.ty = d.y ?? 0; this.c = d.c ?? 0; this.t = d.t ?? 0; this.s = d.s ?? 0; this.a = d.a ?? -1; this.seen = true; }
  lerp(dt) { const k = Math.min(1, dt * 12); this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; }
  read(o) { return clear(o); }
}
export { T };
