/**
 * @file The one verb. The Wobble Model (PLAN.md section 3): each step moves a seat's centre of balance in the unit disc
 * from its input, its instability, a slow sway and any disturbance, runs the breath, and notices a topple. Sway is
 * written with plain `Math.sin`, so the sim's math swap reaches it; phases come from the stream `sway`, per seat.
 */
import { gameNumber } from './settings';
import { cue, flowOf, type SeatE, type W, type Wobble } from './types';

const TAU = Math.PI * 2;
/** Steps past r = 1 that make a topple; steps of the walk back to centre. */
const OVER = 6;
const RECOVER = 60;
/** How fast the stick's target moves, units a second. */
const SLEW = 4;

/** Fills a seat's sway from the stream `sway`, once. */
export function seedSway(w: W, wobble: Wobble): void {
  const rng = w.rng('sway');
  wobble.p = [0, 1, 2, 3, 4, 5].map(() => rng.range(0, TAU));
  wobble.m = [0, 1, 2, 3, 4, 5].map(() => rng.range(0.8, 1.25));
}

/** The sway on one axis at step `tick` (the plan's formula). */
function noise(tick: number, rate: number, wobble: Wobble, axis: number): number {
  const t = tick / 60;
  const { p, m } = wobble;
  const o = axis * 3;
  return (
    (Math.sin(TAU * rate * m[o] * t + p[o]) +
      0.6 * Math.sin(TAU * rate * 1.7 * m[o + 1] * t + p[o + 1]) +
      0.3 * Math.sin(TAU * rate * 3.1 * m[o + 2] * t + p[o + 2])) /
    1.3
  );
}

/** The guide's lungs at step `tick`: 1 means full. Half a breath in, half out, triangle-shaped. */
export function guideOf(tick: number, period: number): number {
  const steps = Math.max(1, Math.round(period * 60));
  const at = (tick % steps) / steps;
  return at < 0.5 ? at * 2 : 2 - at * 2;
}

/** Whether the guide is breathing in now. */
export const guideIn = (tick: number, period: number): boolean =>
  tick % Math.max(1, Math.round(period * 60)) < Math.round(period * 30);

/** Steps the seat's breath: holding both feet fills the lungs, letting go empties them, a match with the guide calms. */
export function stepBreath(w: W, e: SeatE, tick: number): void {
  const { wobble, seat } = e;
  const period = gameNumber(w, 'game.breath.period');
  const both = seat.input.l >= 0.5 && seat.input.r >= 0.5;
  const rate = 2 / (period * 60);
  wobble.lungs = Math.max(0, Math.min(1, wobble.lungs + (both ? rate : -rate)));
  const match = 1 - Math.min(1, Math.abs(wobble.lungs - guideOf(tick, period)) * 2.5);
  wobble.sync += (match - wobble.sync) * 0.02;
  wobble.syncSum += match;
  wobble.syncN += 1;
  wobble.calm += (Math.max(0, (wobble.sync - 0.45) / 0.45) - wobble.calm) * 0.01;
  wobble.calm = Math.max(0, Math.min(1, wobble.calm));
}

/** Resets a seat's balance for a new activity. */
export function resetWobble(wobble: Wobble): void {
  Object.assign(wobble, { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, mx: 0, my: 0, calm: 0, lungs: 0, sync: 0,
    syncSum: 0, syncN: 0, over: 0, recover: 0, topples: 0, instab: 1, sway: 1, off: false, bx: 0, by: 0 }); // prettier-ignore
}

/** The sync so far as a share, 0 to 1. */
export const syncShare = (wobble: Wobble): number => (wobble.syncN ? wobble.syncSum / wobble.syncN : 0);

/** One step of the Wobble Model for a seat at `tick`; emits `topple` when it goes over. */
export function stepWobble(w: W, e: SeatE, disturb: [number, number] = [0, 0]): void {
  const { wobble, seat } = e;
  const flow = flowOf(w);
  const dt = 1 / 60;
  const gain = gameNumber(w, 'game.wobble.gain');
  const instability = gameNumber(w, 'game.wobble.instability') * wobble.instab;
  const damping = gameNumber(w, 'game.wobble.damping');
  const reach = gameNumber(w, 'game.wobble.reach');
  const rate = gameNumber(w, 'game.wobble.noiseRate');
  const strength = gameNumber(w, 'game.wobble.noise') * wobble.sway * (1 + seat.extra) * (flow.steadier ? 0.5 : 1);
  const calmEffect = gameNumber(w, 'game.breath.calmEffect');
  const ease = seat.input.gentle ? 0.4 : 1;
  const limit = SLEW * dt;
  wobble.tx += Math.max(-limit, Math.min(limit, seat.input.x - wobble.tx));
  wobble.ty += Math.max(-limit, Math.min(limit, seat.input.y - wobble.ty));
  wobble.mx *= Math.exp(-dt / 0.6);
  wobble.my *= Math.exp(-dt / 0.6);
  let tx = (wobble.tx + wobble.mx) * ease * reach;
  let ty = (wobble.ty + wobble.my) * ease * reach;
  const len = Math.hypot(tx, ty);
  if (len > 1) [tx, ty] = [tx / len, ty / len];
  if (wobble.recover > 0) {
    wobble.recover -= 1;
    const k = 1 / Math.max(1, wobble.recover + 1);
    wobble.x -= wobble.x * k;
    wobble.y -= wobble.y * k;
    wobble.vx = 0;
    wobble.vy = 0;
    return;
  }
  const quiet = 1 - calmEffect * wobble.calm;
  const axes: [number, number, number, number][] = [
    [tx, wobble.x, wobble.bx + disturb[0], 0],
    [ty, wobble.y, wobble.by + disturb[1], 1],
  ];
  for (const [target, at, push, axis] of axes) {
    const accel = gain * (target - at) + instability * at + noise(w.tick, rate, wobble, axis) * strength * quiet + push;
    if (axis === 0) {
      wobble.vx = (wobble.vx + accel * dt) * Math.exp(-damping * dt);
      wobble.x += wobble.vx * dt;
    } else {
      wobble.vy = (wobble.vy + accel * dt) * Math.exp(-damping * dt);
      wobble.y += wobble.vy * dt;
    }
  }
  const r = Math.hypot(wobble.x, wobble.y);
  if (r > 1 && !flow.noTopple) {
    wobble.over += 1;
    if (wobble.over >= OVER) {
      wobble.over = 0;
      wobble.recover = RECOVER;
      wobble.topples += 1;
      w.emit('topple', { seat: seat.index, actor: seat.actor } as never);
      cue(w, 'creak', { r: 1 });
    }
  } else wobble.over = 0;
  if (flow.noTopple && r > 0.98) {
    wobble.x *= 0.98 / r;
    wobble.y *= 0.98 / r;
  }
}
