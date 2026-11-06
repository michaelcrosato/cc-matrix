/**
 * @file Still Pond. Composure starts at 1000. Breathing is the only correct input.
 * Anything else costs composure, once a second at most. Doing nothing scores exactly 500.
 * A lure that looks like a pause does not pause anything.
 */
import type { Intents, World } from '../../../../engine/sim-api';
import { type Band, stickIntents, wantBreath } from '../bot';
import { clampScore } from '../score';
import { resetAct } from '../state';
import { resetBalance } from '../wobble';
import { LURES } from '../data/lures';
import { actOf, apply, cfgOf, readSeat, rowOf, sweep } from './kit';

const PENALTY_GAP = 60;

/** Draws lure times, 6 to 10 seconds apart, and starts composure at 1000. */
export function setup(w: World, seconds = 75): void {
  const act = actOf(w);
  resetAct(act);
  const row = rowOf(w, 0);
  resetBalance(row.wobble, row.hist);
  act.calm = 1000;
  act.n = Math.round(seconds * 60);
  const rng = w.rng('lure');
  const goals: number[] = [];
  let at = rng.int(6 * 60, 10 * 60);
  let i = 0;
  while (at < act.n && i < LURES.length) {
    goals.push(at, i);
    at += rng.int(6 * 60, 10 * 60);
    i += 1;
  }
  act.goals = goals;
}

/** True when this step disturbed the pond. Breath is not a disturbance. A real pause never arrives here. */
export function disturbed(w: World, intents: Intents): boolean {
  const seat = readSeat(intents);
  const lean = Math.hypot(seat.x, seat.y) > 0.25;
  const mouse = Math.hypot(seat.mdx, seat.mdy) > 0.02;
  const stray = seat.fl > 0.5 !== seat.fr > 0.5;
  return lean || mouse || stray || seat.act > 0.5;
}

/** One quiet step, or one that is not. */
export function step(w: World, intents: Intents): void {
  const act = actOf(w);
  if (act.done) return;
  const { body } = apply(w, intents, { noise: 0.35 });
  act.tick += 1;
  if (act.wait > 0) act.wait -= 1;
  const show = act.flags;
  if (show < act.goals.length / 2 && act.tick >= (act.goals[show * 2] ?? 0)) {
    const index = act.goals[show * 2 + 1] ?? 0;
    act.text = LURES[index]?.id ?? '';
    act.m = act.tick;
    act.flags = show + 1;
  }
  if (act.text && act.tick - act.m > 3 * 60) act.text = '';
  if (disturbed(w, intents) && act.wait === 0) {
    act.calm = Math.max(0, act.calm - Number(w.settings.get('game.pond.penalty')));
    act.wait = PENALTY_GAP;
    act.falls += 1;
  }
  if (readSeat(intents).both) act.pose = 1;
  act.samples += 1;
  if (act.pose) act.acc += body.sync;
  if (act.tick >= act.n) act.done = 1;
}

/** Composure times half plus half the breath. Never breathing keeps the breath term at 0, so idle is 500. */
export function score(w: World): number {
  const act = actOf(w);
  const sync = act.pose && act.samples ? act.acc / act.samples : 0;
  return clampScore(act.calm * (0.5 + 0.5 * sync));
}

/** Breathes on the delayed guide and never takes a lure. */
export function bot(w: World, band: Band): Intents {
  const cfg = cfgOf(w);
  const both = wantBreath(band, w.time, cfg.period);
  return stickIntents({ x: 0, y: 0 }, { both });
}

/** Removes ripples and birds this activity spawned. */
export function teardown(w: World): void {
  sweep(w);
}

/** The activity record. `seconds` is the long sit. Group Class asks for the short one. */
export const pond = {
  id: 'pond',
  title: 'Still Pond',
  seconds: 75,
  setup,
  step,
  teardown,
  score,
  bot,
};
