/**
 * @file The Line. Alternate feet to walk a slackline. Lean cancels the sideways kick.
 * A gust shoves. A gull sits until the stick flicks. Falling returns you to the last flag.
 * At two minutes the boat collects whoever is still out there.
 */
import type { Intents, World } from '../../../../engine/sim-api';
import { type Band, seek, stickIntents } from '../bot';
import { clampScore } from '../score';
import { resetAct } from '../state';
import { clamp, resetBalance } from '../wobble';
import { actOf, apply, cfgOf, flowOf, rowOf, sweep } from './kit';

const LENGTH = 40;

/** Schedules gusts and stands the guest at the first flag. */
export function setup(w: World): void {
  const act = actOf(w);
  resetAct(act);
  const row = rowOf(w, 0);
  resetBalance(row.wobble, row.hist);
  const rng = w.rng('gust');
  const goals: number[] = [];
  let at = rng.int(5 * 60, 8 * 60);
  while (at < 110 * 60) {
    goals.push(at, rng.int(0, 1) === 0 ? -1 : 1);
    at += rng.int(6 * 60, 10 * 60);
  }
  act.goals = goals;
  flowOf(w).line = 'line.start';
}

/** One step along the rope. */
export function step(w: World, intents: Intents): void {
  const act = actOf(w);
  if (act.done) return;
  const { body, seat } = apply(w, intents);
  act.tick += 1;
  if (act.wait > 0) act.wait -= 1;
  const next = act.flags;
  const gustAt = act.goals[next * 2] ?? -1;
  if (next < act.goals.length / 2 && act.tick === gustAt - 90) flowOf(w).line = 'line.gust';
  if (next < act.goals.length / 2 && act.tick >= gustAt) {
    const sign = act.goals[next * 2 + 1] ?? 1;
    act.hz += sign * Number(w.settings.get('game.line.gust'));
    act.flags = next + 1;
  }
  if (act.dist >= 15 && act.pose === 0) {
    act.pose = 1;
    flowOf(w).line = 'line.gull';
  }
  const bias = act.pose === 1 ? 0.35 : 0;
  if (act.pose === 1 && act.px * seat.x < 0 && Math.abs(seat.x - act.px) > 0.75) {
    act.pose = 2;
    flowOf(w).line = 'line.flick';
  }
  act.px = seat.x;
  if (act.wait === 0) {
    act.hx += (act.hz + bias) * w.dt;
    act.hx -= body.x * 1.8 * w.dt;
    act.hz *= Math.exp(-w.dt / 0.45);
    const prevL = act.m === 1 || act.m === 3;
    const prevR = act.m === 2 || act.m === 3;
    const nowL = seat.fl > 0.5;
    const nowR = seat.fr > 0.5;
    if (nowL && !prevL) foot(w, 1);
    if (nowR && !prevR) foot(w, 2);
    act.m = (nowL ? 1 : 0) + (nowR ? 2 : 0);
    if (Math.abs(act.hx) > 1.15) {
      act.falls += 1;
      act.dist = act.b;
      act.hx = 0;
      act.hz = 0;
      act.wait = 45;
      flowOf(w).line = 'line.fall';
    }
  }
  if (act.dist >= LENGTH || act.tick >= 120 * 60) {
    act.dist = Math.min(LENGTH, act.dist);
    act.done = 1;
    flowOf(w).line = act.dist >= LENGTH ? 'line.done' : 'line.close';
  }
}

/** A legal step, or a stumble when the same foot goes twice. */
function foot(w: World, which: number): void {
  const act = actOf(w);
  const kick = Number(w.settings.get('game.line.stepKick'));
  if (act.foot === which) {
    act.hx += which === 1 ? 0.5 : -0.5;
    return;
  }
  act.dist = Math.min(LENGTH, act.dist + 0.75);
  act.hz += (which === 1 ? 1 : -1) * kick;
  act.foot = which;
  const span = LENGTH / 3;
  act.b = Math.floor(act.dist / span) * span;
}

/** Time and falls, times how much of the rope you crossed. */
export function score(w: World): number {
  const act = actOf(w);
  const seconds = act.tick / 60;
  const share = clamp(act.dist / LENGTH, 0, 1);
  const raw = (1000 - 150 * act.falls - 8 * Math.max(0, seconds - 50)) * share;
  return clampScore(raw);
}

/** Steps in time and leans against the error it can already see. */
export function bot(w: World, band: Band): Intents {
  const act = actOf(w);
  if (band === 'idle') return stickIntents({ x: 0, y: 0 }, {});
  const row = rowOf(w, 0);
  const cfg = cfgOf(w);
  const bias = act.pose === 1 ? 0.35 : 0;
  const desired = clamp((act.hz + bias + act.hx * 2.4) / 1.8, -0.9, 0.9);
  const stick = seek(band, desired, 0, row.wobble, row.hist, cfg, w.tick);
  const left = Math.floor(w.tick / 22) % 2 === 0;
  return stickIntents(stick, left ? { l: true } : { r: true });
}

/** The boat and the gull leave with the activity. */
export function teardown(w: World): void {
  sweep(w);
}

/** The activity record. */
export const line = {
  id: 'line',
  title: 'The Line',
  seconds: 120,
  setup,
  step,
  teardown,
  score,
  bot,
};
