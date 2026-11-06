/**
 * @file Paddle Glide. Forward lean is speed. Side lean steers. Alternating feet add a kick.
 * Twelve gates around the lagoon. A topple is a splash and a short remount, not an ending.
 */
import type { Intents, World } from '../../../../engine/sim-api';
import { type Band, seek, stickIntents } from '../bot';
import { clampScore } from '../score';
import { resetAct } from '../state';
import { clamp, resetBalance } from '../wobble';
import { actOf, apply, cfgOf, rowOf, sweep } from './kit';

/** Where gate `i` sits. `jitter` is a few metres from the seed. */
export function gateAt(i: number, jitter: number): { x: number; z: number } {
  const a = (i / 12) * Math.PI * 2;
  const r = 26 + jitter;
  return { x: Math.sin(a) * r, z: Math.cos(a) * r };
}

/** Draws the twelve jitters and puts the board behind the first gate. */
export function setup(w: World): void {
  const act = actOf(w);
  resetAct(act);
  const row = rowOf(w, 0);
  resetBalance(row.wobble, row.hist);
  const rng = w.rng('gates');
  const goals: number[] = [];
  for (let i = 0; i < 12; i++) goals.push(rng.range(-2, 2));
  act.goals = goals;
  const first = gateAt(0, goals[0] ?? 0);
  act.px = first.x - 6;
  act.py = first.z;
  act.hx = Math.atan2(first.x - act.px, first.z - act.py);
  act.top0 = 0;
}

/** One step of the board. */
export function step(w: World, intents: Intents): void {
  const act = actOf(w);
  if (act.done) return;
  if (act.pose !== act.n) {
    act.pose = act.n;
    act.hold = 0;
  }
  act.hold += 1;
  let dx = 0;
  let dy = 0;
  if (act.n === 7 && act.hold < 70) dx = 1.1;
  if (act.n === 9 && act.hold < 70) dy = 0.9;
  const { body, seat } = apply(w, intents, { dx, dy });
  act.tick += 1;
  if (body.topples > act.top0) {
    act.top0 = body.topples;
    act.wait = 180;
    act.falls += 1;
  }
  if (act.wait > 0) act.wait -= 1;
  const prevL = act.m === 1 || act.m === 3;
  const prevR = act.m === 2 || act.m === 3;
  const nowL = seat.fl > 0.5;
  const nowR = seat.fr > 0.5;
  if ((nowL && !prevL && act.foot === 2) || (nowR && !prevR && act.foot === 1)) act.flags = 50;
  if (nowL && !prevL) act.foot = 1;
  if (nowR && !prevR) act.foot = 2;
  act.m = (nowL ? 1 : 0) + (nowR ? 2 : 0);
  if (act.flags > 0) act.flags -= 1;
  const speed = act.wait > 0 ? 0 : Math.max(0, body.y) * Number(w.settings.get('game.paddle.speed'));
  const kick = act.flags > 0 ? 1.3 : 1;
  act.hx += body.x * 1.2 * w.dt;
  act.px += Math.sin(act.hx) * speed * kick * w.dt;
  act.py += Math.cos(act.hx) * speed * kick * w.dt;
  if (act.n < 12) {
    const gate = gateAt(act.n, act.goals[act.n] ?? 0);
    if (Math.hypot(gate.x - act.px, gate.z - act.py) < 4) act.n += 1;
  }
  if (act.n >= 12 || act.tick >= 75 * 60) act.done = 1;
}

/** Gates, plus a time bonus only when every gate is behind you. */
export function score(w: World): number {
  const act = actOf(w);
  const gates = Math.min(12, act.n);
  let value = gates * 60;
  if (gates >= 12) value += 280 * Math.max(0, 1 - act.tick / 60 / 75);
  return clampScore(value);
}

/** Steers at the next gate and leans forward. */
export function bot(w: World, band: Band): Intents {
  const act = actOf(w);
  if (band === 'idle') return stickIntents({ x: 0, y: 0 }, {});
  const row = rowOf(w, 0);
  const cfg = cfgOf(w);
  const gate = gateAt(Math.min(11, act.n), act.goals[Math.min(11, act.n)] ?? 0);
  const want = Math.atan2(gate.x - act.px, gate.z - act.py);
  let err = want - act.hx;
  if (err > Math.PI) err -= Math.PI * 2;
  if (err < -Math.PI) err += Math.PI * 2;
  const turn = clamp(err / 0.9, -0.8, 0.8);
  const forward = Math.abs(err) > 0.45 ? 0.22 : 0.72;
  const stick = seek(band, turn, forward, row.wobble, row.hist, cfg, w.tick);
  const left = Math.floor(w.tick / 28) % 2 === 0;
  return stickIntents(stick, left ? { l: true } : { r: true });
}

/** The board is put away. */
export function teardown(w: World): void {
  sweep(w);
}

/** The activity record. */
export const paddle = {
  id: 'paddle',
  title: 'Paddle Glide',
  seconds: 75,
  setup,
  step,
  teardown,
  score,
  bot,
};
