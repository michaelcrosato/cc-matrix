import { applyDeadzone } from '../../pixel-engine.js';

/** Delayed PD. Same bots for classmates, attract, and tests. */
export const BOT_SKILLS = {
  sloppy: { tau: 0.42, kp: 0.7, kd: 0.12, err: 1.3 },
  average: { tau: 0.3, kp: 1.1, kd: 0.35, err: 0.8 },
  good: { tau: 0.22, kp: 1.5, kd: 0.55, err: 0.45 },
  expert: { tau: 0.17, kp: 1.9, kd: 0.7, err: 0.2 },
};

export function clampDisc(x, y) {
  const m = Math.hypot(x, y);
  if (m > 1) return { x: x / m, y: y / m };
  return { x, y };
}

const EMPTY = { x: 0, y: 0, breath: false, stepL: false, stepR: false, confirm: false, depth: 0 };

export class BotDriver {
  constructor(skill, rand, targetFn) {
    this.skill = skill;
    this.rand = rand || Math.random;
    this.targetFn = targetFn || (() => ({ x: 0, y: 0 }));
    this.hist = [];
    this.dx = 0;
    this.dy = 0;
    this.t = 0;
    this.displayOnly = false;
  }
  read(dot, dt = 1 / 60) {
    if (this.skill === 'idle' || !BOT_SKILLS[this.skill]) return { ...EMPTY };
    const b = BOT_SKILLS[this.skill];
    this.t += dt;
    const p = dot || { x: 0, y: 0, vx: 0, vy: 0 };
    this.hist.push({ t: this.t, x: p.x, y: p.y, vx: p.vx, vy: p.vy });
    const want = this.t - b.tau;
    let seen = this.hist[0];
    for (const h of this.hist) if (h.t <= want + 1e-9) seen = h;
    while (this.hist.length > 2 && this.hist[1].t < want) this.hist.shift();
    const tgt = this.targetFn() || { x: 0, y: 0 };
    this.dx += (this.rand() - 0.5) * b.err * dt * 6;
    this.dy += (this.rand() - 0.5) * b.err * dt * 6;
    this.dx *= 0.995;
    this.dy *= 0.995;
    let ux = -b.kp * (seen.x - (tgt.x || 0)) - b.kd * seen.vx + this.dx;
    let uy = -b.kp * (seen.y - (tgt.y || 0)) - b.kd * seen.vy + this.dy;
    const c = clampDisc(ux, uy);
    return { ...EMPTY, x: c.x, y: c.y };
  }
}

/** Keyboard attack 0.10s, release 0.06s. Shift halves the lean. */
export function smoothKeys(state, wishX, wishY, dt, shift) {
  const ax = wishX === 0 ? 0.06 : 0.1;
  const ay = wishY === 0 ? 0.06 : 0.1;
  const kx = 1 - Math.exp(-dt / ax);
  const ky = 1 - Math.exp(-dt / ay);
  state.x += (wishX - state.x) * kx;
  state.y += (wishY - state.y) * ky;
  const scale = shift ? 0.5 : 1;
  return clampDisc(state.x * scale, state.y * scale);
}

export class LocalDriver {
  constructor() {
    this.keys = { x: 0, y: 0 };
    this.displayOnly = false;
  }
  /**
   * u from the last device's lean.
   * stick: moveAxis. keys: WASD/arrows. mouse: offset from the dial, a force.
   */
  readFrom(ctx, device, dial, radius, dt) {
    const input = ctx.input;
    const axis = input.moveAxis();
    const pad = Math.hypot(input.padAxis?.x || 0, input.padAxis?.y || 0) > 0.05;
    let x = 0;
    let y = 0;
    if (device === 'mouse') {
      const p = input.pointer;
      const ax = ((p.x + 1) / 2) * ctx.hud.width;
      const ay = ((1 - p.y) / 2) * ctx.hud.height;
      const ox = (ax - dial.x) / radius;
      const oy = (dial.y - ay) / radius;
      const c = clampDisc(ox, oy);
      x = c.x;
      y = c.y;
    } else if (device === 'pad' || pad) {
      x = axis.x;
      y = axis.y;
    } else {
      const wishX = (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0);
      const wishY = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
      const shift = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const c = smoothKeys(this.keys, wishX, wishY, dt, shift);
      x = c.x;
      y = c.y;
    }
    const breath = input.isDown('Space') || input.isDown('PadR2') || input.isDown('PadCross') || input.isDown('MouseLeft');
    const stepL = input.isDown('KeyF') || input.isDown('ArrowLeft') || input.isDown('PadL1') || input.isDown('PadL2') || (input.mouseButtons & 1) !== 0;
    const stepR = input.isDown('KeyJ') || input.isDown('ArrowRight') || input.isDown('PadR1') || input.isDown('PadR2') || (input.mouseButtons & 2) !== 0;
    const confirm = input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('KeyE') || input.wasPressed('PadCross');
    const keyboard = device !== 'mouse' && device !== 'pad' && !pad;
    // Keys cannot hold a depth. S moves a rep one way and W the other, at the target speed.
    const downKey = input.isDown('KeyS') || input.isDown('ArrowDown');
    const upKey = input.isDown('KeyW') || input.isDown('ArrowUp');
    const rate = keyboard ? (downKey ? 1 : 0) - (upKey ? 1 : 0) : 0;
    return { x, y, breath, stepL, stepR, confirm, depth: Math.max(0, -y), useRate: keyboard, rate };
  }
}

/** One physical pad, by index. The engine merges pads, so lanes read the browser themselves. */
export class PadDriver {
  constructor(index) {
    this.index = index;
    this.displayOnly = false;
    this.prevL = false;
    this.prevR = false;
  }
  pad() {
    const nav = globalThis.navigator;
    if (!nav?.getGamepads) return null;
    const list = nav.getGamepads();
    return list?.[this.index] || null;
  }
  read() {
    const pad = this.pad();
    if (!pad) return { ...EMPTY };
    const ax = pad.axes?.[0] || 0;
    const ay = pad.axes?.[1] || 0;
    const dz = applyDeadzone(ax, -ay, 0.12);
    const b = (i) => !!(pad.buttons?.[i]?.pressed);
    const stepL = b(4) || b(6);
    const stepR = b(5) || b(7);
    const out = {
      x: dz.x,
      y: dz.y,
      breath: b(7) || b(0),
      stepL,
      stepR,
      confirm: b(0),
      depth: Math.max(0, -dz.y),
      edgeL: stepL && !this.prevL,
      edgeR: stepR && !this.prevR,
    };
    this.prevL = stepL;
    this.prevR = stepR;
    return out;
  }
}

/** Display only. Never steps a Dot. */
export class GhostDriver {
  constructor() {
    this.displayOnly = true;
    this.simulated = false;
    this.target = null;
    this.shown = { x: 0, y: 0, c: 0, t: 0, s: 0, a: 0 };
  }
  push(msg) {
    if (!msg) return;
    this.target = msg;
  }
  present(dt) {
    if (!this.target) return this.shown;
    const k = 1 - Math.exp(-Math.max(0, dt) * 12);
    this.shown.x += ((this.target.x || 0) - this.shown.x) * k;
    this.shown.y += ((this.target.y || 0) - this.shown.y) * k;
    this.shown.c = this.target.c ?? this.shown.c;
    this.shown.t = this.target.t ?? this.shown.t;
    this.shown.s = this.target.s ?? this.shown.s;
    this.shown.a = this.target.a ?? this.shown.a;
    return this.shown;
  }
  read() {
    return { ...EMPTY };
  }
}
