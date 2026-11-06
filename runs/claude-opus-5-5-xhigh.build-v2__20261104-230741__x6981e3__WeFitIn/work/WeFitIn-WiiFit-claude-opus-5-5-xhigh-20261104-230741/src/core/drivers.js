// One seam for "who is moving this lane": a person, a pad, a bot or a ghost.
// read(out, ...) fills { x, y, breath, stepL, stepR, confirm, rate }.
import { LEFT_FOOT, RIGHT_FOOT, BREATH, CONFIRM_PLAY } from './actions.js';

export function blankInput() {
  return { x: 0, y: 0, breath: false, stepL: false, stepR: false, confirm: false, rate: false, flick: 0 };
}

export const SKILLS = {
  idle: null,
  sloppy: { tau: 0.42, kp: 0.7, kd: 0.12, err: 1.3 },
  average: { tau: 0.3, kp: 1.1, kd: 0.35, err: 0.8 },
  good: { tau: 0.22, kp: 1.5, kd: 0.55, err: 0.45 },
  expert: { tau: 0.17, kp: 1.9, kd: 0.7, err: 0.2 },
};
export const SKILL_NAMES = ['idle', 'sloppy', 'average', 'good', 'expert'];

/** How well a skill does things other than balance: timing error (s), slip chance, reaction (s). */
export const SKILL_PLAY = {
  idle: { timing: 0, miss: 1, react: 9, wander: 0, speed: 0 },
  sloppy: { timing: 0.16, miss: 0.35, react: 0.6, wander: 0.35, speed: 0.55 },
  average: { timing: 0.085, miss: 0.1, react: 0.38, wander: 0.18, speed: 0.8 },
  good: { timing: 0.045, miss: 0.03, react: 0.24, wander: 0.09, speed: 0.95 },
  expert: { timing: 0.02, miss: 0.005, react: 0.14, wander: 0.04, speed: 1 },
};

export function clampDisc(o) {
  const d = Math.hypot(o.x, o.y);
  if (d > 1) { o.x /= d; o.y /= d; }
  return o;
}

/** The delayed PD controller every bot balances with. */
export class BotBrain {
  constructor(skill, rand) {
    this.skill = skill;
    this.p = SKILLS[skill];
    this.play = SKILL_PLAY[skill] ?? SKILL_PLAY.idle;
    this.rand = rand;
    this.hist = [];
    this.dx = 0; this.dy = 0;
  }

  /** Writes a lean toward (tx, ty) into out, from what the bot saw tau seconds ago. */
  lean(out, dot, tx, ty, dt) {
    if (!this.p) { out.x = 0; out.y = 0; return out; }
    const { tau, kp, kd, err } = this.p;
    this.hist.push(dot.x, dot.y, dot.vx, dot.vy);
    const n = Math.max(1, Math.round(tau / dt));
    if (this.hist.length > (n + 1) * 4) this.hist.splice(0, this.hist.length - (n + 1) * 4);
    const sx = this.hist[0], sy = this.hist[1], svx = this.hist[2], svy = this.hist[3];
    this.dx += (this.rand() - 0.5) * err * dt * 6; this.dx *= 0.995;
    this.dy += (this.rand() - 0.5) * err * dt * 6; this.dy *= 0.995;
    out.x = -kp * (sx - tx) - kd * svx + this.dx;
    out.y = -kp * (sy - ty) - kd * svy + this.dy;
    return clampDisc(out);
  }
}

const DESK_LEFT = ['KeyF', 'ArrowLeft', 'MouseLeft'];
const DESK_RIGHT = ['KeyJ', 'ArrowRight', 'MouseRight'];
const DESK_CONFIRM = ['Space', 'Enter', 'MouseLeft'];

/** One click is a left foot and a confirm at once: take it once, then hand it to both. */
function readPresses(out, input, left, right, confirm) {
  const click = input.consumePress('MouseLeft');
  out.stepL = click || input.consumeAny(left);
  out.stepR = input.consumeAny(right);
  out.confirm = click || input.consumeAny(confirm);
}

/** Keyboard lean, smoothed. attack .10 s, release .06 s, Shift for half. */
export class KeyLean {
  x = 0; y = 0;
  step(input, dt, out) {
    const rawX = (input.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (input.isDown('KeyA', 'ArrowLeft') ? 1 : 0);
    const rawY = (input.isDown('KeyW', 'ArrowUp') ? 1 : 0) - (input.isDown('KeyS', 'ArrowDown') ? 1 : 0);
    const half = input.isDown('ShiftLeft', 'ShiftRight') ? 0.5 : 1;
    this.x = approach(this.x, rawX * half, dt);
    this.y = approach(this.y, rawY * half, dt);
    out.x = this.x; out.y = this.y;
    clampDisc(out);
    return rawX !== 0 || rawY !== 0;
  }
}
function approach(v, to, dt) {
  const tau = Math.abs(to) > Math.abs(v) ? 0.1 : 0.06;
  return v + (to - v) * Math.min(1, dt / tau);
}

/** The player: stick, keys or mouse, whichever was used last. */
export class LocalDriver {
  kind = 'local';
  keys = new KeyLean();

  /** dial: { x, y } centre of the player's dial in art pixels (mouse lean). */
  read(out, ctx, dt, app, dial) {
    const { input } = ctx;
    const dev = app.device.last;
    const pad = input.padAxis;
    const heldKeys = this.keys.step(input, dt, out);
    out.rate = false;
    if (dev === 'mouse') {
      const p = app.device.pointerArt(ctx);
      const r = app.T.mouseLeanRadius;
      const cx = dial?.x ?? ctx.hud.width / 2, cy = dial?.y ?? ctx.hud.height / 2;
      out.x = (p.x - cx) / r; out.y = (cy - p.y) / r;
      clampDisc(out);
    } else if (dev === 'pad' || Math.hypot(pad.x, pad.y) > 0) {
      out.x = pad.x; out.y = pad.y;
      clampDisc(out);
    } else {
      out.rate = heldKeys || dev === 'keyboard';
    }
    out.breath = input.anyDown(BREATH);
    readPresses(out, input, LEFT_FOOT, RIGHT_FOOT, CONFIRM_PLAY);
    return out;
  }
}

/** Keyboard and mouse only: Family Hour's K+M mat, which must not see pads. */
export class KeyboardDriver extends LocalDriver {
  kind = 'keyboard';
  read(out, ctx, dt, app, dial) {
    const { input } = ctx;
    const dev = app.device.lastDesk;
    const held = this.keys.step(input, dt, out);
    out.rate = false;
    if (dev === 'mouse') {
      const p = app.device.pointerArt(ctx);
      const r = app.T.mouseLeanRadius;
      out.x = (p.x - (dial?.x ?? ctx.hud.width / 2)) / r;
      out.y = ((dial?.y ?? ctx.hud.height / 2) - p.y) / r;
      clampDisc(out);
    } else out.rate = held || true;
    out.breath = input.isDown('Space', 'MouseLeft');
    readPresses(out, input, DESK_LEFT, DESK_RIGHT, DESK_CONFIRM);
    return out;
  }
}

/** One pad by index. The engine merges pads, so Family Hour reads them itself. */
export class PadDriver {
  kind = 'pad';
  constructor(index, deadzone) { this.index = index; this.deadzone = deadzone; this.prev = []; }
  read(out) {
    const pad = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads()[this.index] : null;
    out.rate = false;
    if (!pad) { out.x = out.y = 0; out.breath = out.stepL = out.stepR = out.confirm = false; return out; }
    const [ax, ay] = this.deadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
    out.x = ax; out.y = -ay;
    clampDisc(out);
    const b = (i) => !!pad.buttons[i]?.pressed;
    const edge = (i) => b(i) && !this.prev[i];
    out.breath = b(7) || b(0);
    out.stepL = edge(4) || edge(6);
    out.stepR = edge(5) || edge(7);
    out.confirm = edge(0);
    for (let i = 0; i < pad.buttons.length; i++) this.prev[i] = b(i);
    return out;
  }
}

/** Bots: the event decides what "good play" means. */
export class BotDriver {
  kind = 'bot';
  constructor(skill, rand) { this.skill = skill; this.brain = new BotBrain(skill, rand); this.rand = rand; }
}

/** Another player's copy: display only, nothing is simulated. */
export class GhostDriver {
  kind = 'ghost';
  x = 0; y = 0; tx = 0; ty = 0; clip = 0; clipTime = 0; score = 0; area = -1; lastAt = -1;
  receive(d) { this.tx = d.x ?? 0; this.ty = d.y ?? 0; this.clip = d.c ?? 0; this.clipTime = d.t ?? 0; this.score = d.s ?? 0; this.area = d.a ?? -1; }
  lerp(dt) {
    const k = Math.min(1, dt * 10);
    this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k;
  }
}

