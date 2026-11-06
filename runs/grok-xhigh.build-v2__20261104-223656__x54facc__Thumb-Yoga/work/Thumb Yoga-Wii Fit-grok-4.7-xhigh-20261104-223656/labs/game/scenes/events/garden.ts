/**
 * @file Sand Garden. The tray tilts with your lean, or with the pointer. Marbles roll in the sim.
 * There is no sway here. A hole catches a marble that has slowed down inside it.
 * Time left is added only when every marble has sunk.
 */
import type { Intents, World } from '../../../../engine/sim-api';
import { type Band, seek, stickIntents } from '../bot';
import { TRAYS, type Tray } from '../data/trays';
import { clampScore } from '../score';
import { resetAct } from '../state';
import { clamp, resetBalance } from '../wobble';
import { actOf, apply, cfgOf, rowOf, sweep } from './kit';

const PACK = 5;

/** Loads the first tray and stills the balance. */
export function setup(w: World): void {
  const act = actOf(w);
  resetAct(act);
  const row = rowOf(w, 0);
  resetBalance(row.wobble, row.hist);
  load(act, TRAYS[0] ?? TRAYS[0]);
  act.n = totalMarbles();
}

function totalMarbles(): number {
  let n = 0;
  for (const tray of TRAYS) n += tray.marbles.length;
  return n;
}

/** Packs a tray's marbles into the board. */
function load(act: { goals: number[]; pose: number; left: number; samples: number }, tray: Tray | undefined): void {
  const goals: number[] = [];
  for (const marble of tray?.marbles ?? []) goals.push(marble.x, marble.y, 0, 0, 0);
  act.goals = goals;
  act.left = 0;
  act.samples = 0;
}

/** Nearest hole on the tray. */
function hole(tray: Tray, x: number, y: number): { x: number; y: number } {
  let best = tray.holes[0] ?? { x: 0, y: 0 };
  let d = Infinity;
  for (const item of tray.holes) {
    const dist = Math.hypot(item.x - x, item.y - y);
    if (dist < d) {
      d = dist;
      best = item;
    }
  }
  return best;
}

/** Rolls every marble on the current tray. */
export function step(w: World, intents: Intents): void {
  const act = actOf(w);
  if (act.done) return;
  const { body, seat } = apply(w, intents, { noise: 0 });
  act.tick += 1;
  act.left += 1;
  const tray = TRAYS[act.pose];
  if (!tray) {
    act.done = 1;
    return;
  }
  const leanX = seat.pointer ? seat.px : body.x;
  const leanY = seat.pointer ? seat.py : body.y;
  const tilt = Number(w.settings.get('game.garden.tilt')) * (Math.PI / 180);
  const gravity = Number(w.settings.get('game.garden.gravity'));
  const sink = Number(w.settings.get('game.garden.sink'));
  const ax = Math.sin(clamp(leanX, -1, 1) * tilt) * gravity;
  const ay = Math.sin(clamp(leanY, -1, 1) * tilt) * gravity;
  let live = 0;
  for (let i = 0; i < tray.marbles.length; i++) {
    const o = i * PACK;
    if ((act.goals[o + 4] ?? 0) > 0.5) continue;
    live += 1;
    let x = act.goals[o] ?? 0;
    let y = act.goals[o + 1] ?? 0;
    let vx = (act.goals[o + 2] ?? 0) + ax * w.dt;
    let vy = (act.goals[o + 3] ?? 0) + ay * w.dt;
    const drag = Math.exp(-2.4 * w.dt);
    vx *= drag;
    vy *= drag;
    x += vx * w.dt;
    y += vy * w.dt;
    if (Math.abs(x) > 0.92) {
      x = Math.sign(x) * 0.92;
      vx *= -0.15;
    }
    if (Math.abs(y) > 0.92) {
      y = Math.sign(y) * 0.92;
      vy *= -0.15;
    }
    const target = hole(tray, x, y);
    if (Math.hypot(target.x - x, target.y - y) < 0.12 && Math.hypot(vx, vy) < sink) {
      act.goals[o + 4] = 1;
      act.m += 1;
      live -= 1;
      vx = 0;
      vy = 0;
    }
    act.goals[o] = x;
    act.goals[o + 1] = y;
    act.goals[o + 2] = vx;
    act.goals[o + 3] = vy;
  }
  act.gx = leanX;
  act.gy = leanY;
  if (live === 0 || act.left >= 18 * 60) {
    act.pose += 1;
    if (act.pose >= TRAYS.length) act.done = 1;
    else load(act, TRAYS[act.pose]);
  }
  if (act.tick >= 90 * 60) act.done = 1;
}

/** Share sunk, and time left only for a finished garden. */
export function score(w: World): number {
  const act = actOf(w);
  const share = act.n ? act.m / act.n : 0;
  let value = share * 800;
  if (act.m >= act.n && act.n > 0) value += 200 * Math.max(0, 1 - act.tick / 60 / 90);
  return clampScore(value);
}

/** Tilts toward the unsunk marbles' holes. */
export function bot(w: World, band: Band): Intents {
  const act = actOf(w);
  if (band === 'idle') return stickIntents({ x: 0, y: 0 }, {});
  const tray = TRAYS[act.pose];
  const row = rowOf(w, 0);
  const cfg = cfgOf(w);
  let dx = 0;
  let dy = 0;
  if (tray) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < tray.marbles.length; i++) {
      if ((act.goals[i * PACK + 4] ?? 0) > 0.5) continue;
      const x = act.goals[i * PACK] ?? 0;
      const y = act.goals[i * PACK + 1] ?? 0;
      const target = hole(tray, x, y);
      const dist = Math.hypot(target.x - x, target.y - y);
      if (dist < bestD) {
        bestD = dist;
        best = i;
      }
    }
    if (best >= 0) {
      const x = act.goals[best * PACK] ?? 0;
      const y = act.goals[best * PACK + 1] ?? 0;
      const vx = act.goals[best * PACK + 2] ?? 0;
      const vy = act.goals[best * PACK + 3] ?? 0;
      const target = hole(tray, x, y);
      dx = clamp((target.x - x) * 3.2 - vx * 1.1, -0.9, 0.9);
      dy = clamp((target.y - y) * 3.2 - vy * 1.1, -0.9, 0.9);
    }
  }
  return stickIntents(seek(band, dx, dy, row.wobble, row.hist, cfg, w.tick), {});
}

/** The tray is lifted away. */
export function teardown(w: World): void {
  sweep(w);
}

/** The activity record. */
export const garden = {
  id: 'garden',
  title: 'Sand Garden',
  seconds: 90,
  setup,
  step,
  teardown,
  score,
  bot,
};
