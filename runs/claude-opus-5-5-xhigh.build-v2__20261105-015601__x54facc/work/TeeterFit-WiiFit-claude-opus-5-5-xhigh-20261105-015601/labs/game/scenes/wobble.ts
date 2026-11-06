/**
 * @file The Wobble Model, the game's one verb (PLAN.md section 3): a centre of balance in a unit disc, moved each step
 * by the lean target, instability, a slow sway and disturbances; plus the breath: lungs, a guide, sync and calm.
 *
 * Game code, sim-side: it imports only engine/sim-api.ts. It writes `Math.sin` and friends plainly, so the sim's math
 * swap reaches them, and reads each setting every step, so the dev sliders apply at once.
 *
 * @example
 * // stepWobble(w, seat, wobble); // once per step, for each seat in play
 */
import type { GameWorld, Seat, Wobble } from './components';

/** How fast the lean target moves, units/s: a quick tap is a nudge, a held key a full lean. */
export const SLEW = 4;
/** How much the gentle key scales the lean. */
export const GENTLE = 0.4;
/** Steps past the edge before a topple. */
export const TOPPLE_STEPS = 6;
/** Steps of recovery after a topple: a second. */
export const RECOVER_STEPS = 60;
/** The mouse target's decay time constant, s. */
export const MOUSE_DECAY = 0.6;
/** The most a mouse-made lean reaches. */
const MOUSE_MAX = 1;
/** Seconds of the breath match's memory, as a share of the period. */
const SYNC_MEMORY = 0.5;
/** How fast calm follows sync, 1/s. */
const CALM_RATE = 0.5;

/** A fresh centre of balance, with its sway drawn from the named stream. */
export function makeWobble(w: GameWorld, seat: number, stream = 'sway'): Wobble {
  const rng = w.rng(stream, seat);
  return {
    x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, mx: 0, my: 0, dx: 0, dy: 0,
    instMul: 1, swayMul: 1, on: false, usesBreath: true, over: 0, recover: 0, topples: 0, bt: 0,
    guide: 0, lungs: 0, sync: 0, calm: 0,
    phases: [0, 1, 2, 3, 4, 5].map(() => rng.range(0, 2 * Math.PI)),
    rates: [0, 1, 2, 3, 4, 5].map(() => rng.range(0.8, 1.25)),
  }; // prettier-ignore
}

/** The sway at `t` seconds for an axis (0 or 1), from its phases and rates. */
export function swayAt(wob: Wobble, axis: number, t: number, rate: number): number {
  const at = axis * 3;
  const tau = 2 * Math.PI * rate * t;
  const a = Math.sin(tau * wob.rates[at] + wob.phases[at]);
  const b = 0.6 * Math.sin(tau * 1.7 * wob.rates[at + 1] + wob.phases[at + 1]);
  const c = 0.3 * Math.sin(tau * 3.1 * wob.rates[at + 2] + wob.phases[at + 2]);
  return (a + b + c) / 1.3;
}

/** Puts a body back at the centre, at rest (a new activity). Keeps its sway and its topple count unless told. */
export function resetWobble(wob: Wobble, keepTopples = false): void {
  Object.assign(wob, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, mx: 0, my: 0, dx: 0, dy: 0, over: 0, recover: 0, instMul: 1, swayMul: 1 }); // prettier-ignore
  Object.assign(wob, { bt: 0, guide: 0, lungs: 0, sync: 0, calm: 0, usesBreath: true });
  if (!keepTopples) wob.topples = 0;
}

/** Whether both feet are held on this seat. */
export const bothFeet = (seat: Seat): boolean => seat.fl >= 0.5 && seat.fr >= 0.5;

/** Whether this step's breath keeps time with the guide: in while it fills, out while it empties. */
export function inTime(w: GameWorld, seat: Seat, wob: Wobble): boolean {
  const steps = Math.max(1, Math.round(w.settings.get<number>('game.breath.period') * w.hz));
  const both = wob.usesBreath && bothFeet(seat);
  return (wob.bt % steps) / steps < 0.5 ? both : !both && wob.lungs > 0.02;
}

/** One step of the breath: the guide, the lungs, the running sync and calm. */
function stepBreath(w: GameWorld, seat: Seat, wob: Wobble): void {
  const period = w.settings.get<number>('game.breath.period');
  const steps = Math.max(1, Math.round(period * w.hz));
  wob.bt += 1;
  const phase = (wob.bt % steps) / steps;
  wob.guide = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  const both = wob.usesBreath && bothFeet(seat);
  const rate = (2 / period) * w.dt;
  wob.lungs = Math.min(1, Math.max(0, wob.lungs + (both ? rate : -rate)));
  const inhaling = phase < 0.5;
  const match = inhaling ? (both ? 1 : 0) : !both && wob.lungs > 0.02 ? 1 : 0;
  const memory = Math.max(0.5, period * SYNC_MEMORY);
  wob.sync += (match - wob.sync) * (1 - Math.exp(-w.dt / memory));
  wob.calm += (wob.sync - wob.calm) * (1 - Math.exp(-w.dt * CALM_RATE));
}

/**
 * One step of a body, from its seat's input (the plan's model, per axis). `t` is the sway's clock in seconds. It emits
 * `topple` with the seat's index when the body stays past the edge; `game.noTopple` keeps it inside instead.
 */
export function stepWobble(w: GameWorld, seat: Seat, wob: Wobble): void {
  const dt = w.dt;
  stepBreath(w, seat, wob);
  const get = (path: string) => w.settings.get<number>(path);
  const gain = get('game.wobble.gain');
  const instability = get('game.wobble.instability') * wob.instMul;
  const damping = get('game.wobble.damping');
  const reach = get('game.wobble.reach');
  const calmEffect = get('game.breath.calmEffect');
  const assist = w.settings.get<boolean>('game.assist') ? 0.5 : 1;
  const expert = w.settings.get<boolean>('game.expert') ? 1.3 : 1;
  const noise = get('game.wobble.noise') * wob.swayMul * assist * expert * seat.sway;
  const rate = get('game.wobble.noiseRate');

  wob.mx += seat.mx;
  wob.my += seat.my;
  const decay = Math.exp(-dt / MOUSE_DECAY);
  wob.mx = clamp(wob.mx * decay, MOUSE_MAX);
  wob.my = clamp(wob.my * decay, MOUSE_MAX);

  let wantX = seat.lx + wob.mx;
  let wantY = seat.ly + wob.my;
  const size = Math.hypot(wantX, wantY);
  if (size > 1) [wantX, wantY] = [wantX / size, wantY / size];
  const lean = SLEW * dt;
  wob.tx += clamp(wantX - wob.tx, lean);
  wob.ty += clamp(wantY - wob.ty, lean);
  const scale = (seat.gentle ? GENTLE : 1) * reach;
  let targetX = wob.tx * scale;
  let targetY = wob.ty * scale;
  const far = Math.hypot(targetX, targetY);
  if (far > 1) [targetX, targetY] = [targetX / far, targetY / far];

  if (wob.recover > 0) {
    wob.recover -= 1;
    const back = Math.exp(-dt * 5);
    [wob.x, wob.y, wob.vx, wob.vy] = [wob.x * back, wob.y * back, 0, 0];
    wob.dx = wob.dy = 0;
    return;
  }

  const t = w.tick / w.hz;
  const sway = noise * (1 - calmEffect * wob.calm);
  const ax = gain * (targetX - wob.x) + instability * wob.x + swayAt(wob, 0, t, rate) * sway + wob.dx;
  const ay = gain * (targetY - wob.y) + instability * wob.y + swayAt(wob, 1, t, rate) * sway + wob.dy;
  const keep = Math.exp(-damping * dt);
  wob.vx = (wob.vx + ax * dt) * keep;
  wob.vy = (wob.vy + ay * dt) * keep;
  wob.x += wob.vx * dt;
  wob.y += wob.vy * dt;
  wob.dx = wob.dy = 0;

  const r = Math.hypot(wob.x, wob.y);
  if (w.settings.get<boolean>('game.noTopple') && r > 0.98) {
    wob.x *= 0.98 / r;
    wob.y *= 0.98 / r;
    wob.over = 0;
    return;
  }
  wob.over = r > 1 ? wob.over + 1 : 0;
  if (wob.over >= TOPPLE_STEPS) {
    wob.over = 0;
    wob.recover = RECOVER_STEPS;
    wob.topples += 1;
    w.emit('topple', { seat: seat.index, x: wob.x, y: wob.y });
  }
}

/** `v` kept within ±`limit`. */
export function clamp(v: number, limit: number): number {
  return v > limit ? limit : v < -limit ? -limit : v;
}

/** Whether the body is within `r` of the point `x, y`. */
export function inRing(wob: Wobble, x: number, y: number, r: number): boolean {
  return Math.hypot(wob.x - x, wob.y - y) <= r;
}
