/**
 * @file Morning Check. Still ring, six reaches, then one foot. The age is computed from the share.
 * Doing nothing stays in the ring only some of the time, and never holds a reach or a foot.
 */
import type { Intents, World } from '../../../../engine/sim-api';
import { type Band, seek, stickIntents } from '../bot';
import { clampScore } from '../score';
import { resetAct } from '../state';
import { resetBalance } from '../wobble';
import { actOf, apply, cfgOf, flowOf, rowOf, sweep } from './kit';

const STILL = 12 * 60;
const REACH = 24 * 60;
const FOOT = 8 * 60;
const HOLD = 30;

const QUESTIONS = ['ask.side', 'ask.person', 'ask.foot', 'ask.sleep', 'ask.centre'];

/** Clears the board and draws the six reaches and the named foot. */
export function setup(w: World): void {
  const act = actOf(w);
  resetAct(act);
  const row = rowOf(w, 0);
  resetBalance(row.wobble, row.hist);
  const reach = w.rng('reach');
  const goals: number[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = reach.range(0, Math.PI * 2);
    goals.push(Math.cos(ang) * 0.5, Math.sin(ang) * 0.5);
  }
  act.goals = goals;
  act.foot = w.rng('foot').int(0, 1) === 0 ? 1 : 2;
  const ask = w.rng('ask').int(0, QUESTIONS.length - 1);
  flowOf(w).line = QUESTIONS[ask] ?? 'ask.centre';
  act.text = act.foot === 1 ? 'left' : 'right';
}

/** One step of the three tests. */
export function step(w: World, intents: Intents): void {
  const act = actOf(w);
  if (act.done) return;
  const inst = act.phase === 2 ? 1.6 : 1;
  const { body, seat } = apply(w, intents, { inst });
  act.tick += 1;
  act.left += 1;
  if (act.phase === 0) {
    const ring = act.left > 8 * 60 ? 0.16 : 0.22;
    act.samples += 1;
    if (Math.hypot(body.x, body.y) <= ring) act.acc += 1;
    if (act.left >= STILL) {
      act.a = act.samples ? act.acc / act.samples : 0;
      act.phase = 1;
      act.left = 0;
      act.hold = 0;
      act.flags = 0;
    }
    return;
  }
  if (act.phase === 1) {
    const gx = act.goals[act.flags * 2] ?? 0;
    const gy = act.goals[act.flags * 2 + 1] ?? 0;
    act.gx = gx;
    act.gy = gy;
    const inside = Math.hypot(body.x - gx, body.y - gy) <= 0.16;
    act.hold = inside ? act.hold + 1 : 0;
    if (act.hold >= HOLD) {
      act.flags += 1;
      act.hold = 0;
      if (act.flags >= 6) {
        act.b = 1 - act.left / 60 / 24;
        act.phase = 2;
        act.left = 0;
        act.samples = 0;
        act.acc = 0;
      }
    }
    if (act.phase === 1 && act.left >= REACH) {
      act.b = 0;
      act.phase = 2;
      act.left = 0;
      act.samples = 0;
      act.acc = 0;
    }
    return;
  }
  const named = act.foot === 1 ? seat.fl > 0.5 : seat.fr > 0.5;
  act.samples += 1;
  if (named && Math.hypot(body.x, body.y) <= 0.3) act.acc += 1;
  if (act.left >= FOOT) {
    act.c = act.samples ? act.acc / act.samples : 0;
    act.done = 1;
  }
}

/** `1000 * (0.45 A + 0.3 B + 0.25 C)`. */
export function score(w: World): number {
  const act = actOf(w);
  return clampScore(1000 * (0.45 * act.a + 0.3 * act.b + 0.25 * act.c));
}

/** The thumb for the part that is running. */
export function bot(w: World, band: Band): Intents {
  const act = actOf(w);
  const row = rowOf(w, 0);
  const cfg = cfgOf(w);
  if (band === 'idle') return stickIntents({ x: 0, y: 0 }, {});
  if (act.phase === 1) {
    const dx = act.goals[act.flags * 2] ?? 0;
    const dy = act.goals[act.flags * 2 + 1] ?? 0;
    return stickIntents(seek(band, dx, dy, row.wobble, row.hist, cfg, w.tick), {});
  }
  const inst = act.phase === 2 ? 1.6 : 1;
  const stick = seek(band, 0, 0, row.wobble, row.hist, cfg, w.tick, inst);
  if (act.phase === 2) return stickIntents(stick, act.foot === 1 ? { l: true } : { r: true });
  return stickIntents(stick, {});
}

/** Removes anything this check spawned. It spawns nothing, and still sweeps. */
export function teardown(w: World): void {
  sweep(w);
}

/** The activity record. */
export const morning = {
  id: 'morning',
  title: 'Morning Check',
  seconds: 44,
  setup,
  step,
  teardown,
  score,
  bot,
};
