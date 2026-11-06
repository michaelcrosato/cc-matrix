/**
 * @file Pose Class. Enter along a guide, hold the seat, then rest. The enter does not score.
 * The class score is the mean of the holds. Each pose's weights live in the pose table.
 */
import type { Intents, World } from '../../../../engine/sim-api';
import { type Band, seek, stickIntents, wantBreath } from '../bot';
import { POSE_SETS, poseById, type Pose } from '../data/poses';
import { clampScore } from '../score';
import { resetAct } from '../state';
import { resetBalance } from '../wobble';
import { actOf, apply, cfgOf, flowOf, rowOf, sweep } from './kit';

/** Feet the pose wants, plus breath when breath is part of the score. */
function feetFor(pose: Pose, breathe: boolean): { l?: boolean; r?: boolean; both?: boolean } {
  if (pose.feet === 'both') return { both: true };
  if (pose.feet === 'left') return breathe ? { both: true } : { l: true };
  if (pose.feet === 'right') return breathe ? { both: true } : { r: true };
  return breathe ? { both: true } : {};
}

/** True when the named foot is down. Both feet count as each foot. */
function footDown(pose: Pose, fl: number, fr: number): boolean {
  if (pose.feet === 'both') return fl > 0.5 && fr > 0.5;
  if (pose.feet === 'left') return fl > 0.5;
  if (pose.feet === 'right') return fr > 0.5;
  return true;
}

/** The poses for a class id. */
export function posesFor(id: string): Pose[] {
  const ids = POSE_SETS[id] ?? POSE_SETS['pose-a'] ?? [];
  return ids.map((poseId) => poseById(poseId));
}

/** Starts a class. `which` is pose-a, pose-b or pose-c. */
export function setup(w: World, which = 'pose-a'): void {
  const act = actOf(w);
  resetAct(act);
  const row = rowOf(w, 0);
  resetBalance(row.wobble, row.hist);
  act.text = which;
  act.n = posesFor(which).length;
  flowOf(w).line = 'pose.now';
}

function current(w: World): Pose {
  const act = actOf(w);
  const poses = posesFor(act.text || 'pose-a');
  return poses[act.pose] ?? poses[0] ?? poseById('nothing');
}

function seatAt(pose: Pose, index: number): { x: number; y: number } {
  return pose.seats[index] ?? pose.seats[0] ?? { x: 0, y: 0 };
}

/** Writes one hold into the running mean's sum. */
function commit(w: World, pose: Pose): void {
  const act = actOf(w);
  const row = rowOf(w, 0);
  const inShare = act.samples ? act.acc / act.samples : 0;
  const second = act.samples ? act.acc2 / act.samples : 0;
  const raw = 1000 * (pose.weights[0] * inShare + pose.weights[1] * second) - 60 * (row.wobble.topples - act.top0);
  act.a += raw;
  act.m += 1;
  act.samples = 0;
  act.acc = 0;
  act.acc2 = 0;
  act.hold = 0;
}

/** Enter, hold, release, then the next pose. A time box always ends it. */
export function step(w: World, intents: Intents): void {
  const act = actOf(w);
  if (act.done) return;
  const pose = current(w);
  const seatIndex = act.phase === 1 ? act.flags : 0;
  const seat = seatAt(pose, seatIndex);
  const holdSteps = Math.round((pose.hold || Number(w.settings.get('game.pose.hold'))) * 60);
  const ring = pose.ring || Number(w.settings.get('game.pose.ring'));
  const gull = pose.gull && act.phase === 1 && act.left > holdSteps / 2 && act.left < holdSteps / 2 + 90;
  const { body, seat: input } = apply(w, intents, {
    noise: pose.noise,
    inst: pose.instability,
    dx: gull ? 1.1 : 0,
  });
  act.tick += 1;
  act.left += 1;
  const guideT = Math.min(1, act.left / (4 * 60));
  if (act.phase === 0) {
    act.gx = seat.x * guideT;
    act.gy = seat.y * guideT;
    if (Math.hypot(body.x - act.gx, body.y - act.gy) <= 0.18) act.hold = Math.min(1, act.hold + w.dt / 1.4);
    if (act.hold >= 1 || act.left >= 10 * 60) {
      act.phase = 1;
      act.left = 0;
      act.hold = 0;
      act.samples = 0;
      act.acc = 0;
      act.acc2 = 0;
      act.top0 = body.topples;
      act.flags = 0;
    }
  } else if (act.phase === 1) {
    act.gx = seat.x;
    act.gy = seat.y;
    const inside = Math.hypot(body.x - seat.x, body.y - seat.y) <= ring && footDown(pose, input.fl, input.fr);
    act.samples += 1;
    if (inside) act.acc += 1;
    if (pose.feet === 'both') act.acc2 += input.fl > 0.5 && input.fr > 0.5 ? 1 : 0;
    else act.acc2 += body.sync;
    if (act.left >= holdSteps) {
      commit(w, pose);
      if (act.flags + 1 < pose.seats.length) {
        act.flags += 1;
        act.left = 0;
        act.top0 = body.topples;
      } else {
        act.phase = 2;
        act.left = 0;
      }
    }
  } else if (act.left >= 20) {
    act.pose += 1;
    act.phase = 0;
    act.left = 0;
    act.hold = 0;
    act.flags = 0;
    if (act.pose >= act.n) act.done = 1;
  }
  const cap = (act.n * 40 + 10) * 60;
  if (act.tick >= cap) {
    if (act.phase === 1 && act.samples > 0) commit(w, pose);
    act.done = 1;
  }
}

/** The mean of the holds. */
export function score(w: World): number {
  const act = actOf(w);
  if (act.m <= 0) return 0;
  return clampScore(act.a / act.m);
}

/** Follows the guide, then holds the seat, and breathes unless the chair forbids it. */
export function bot(w: World, band: Band): Intents {
  const act = actOf(w);
  const pose = current(w);
  const row = rowOf(w, 0);
  const cfg = cfgOf(w);
  if (band === 'idle') return stickIntents({ x: 0, y: 0 }, {});
  const seatIndex = act.phase === 1 ? act.flags : 0;
  const seat = seatAt(pose, seatIndex);
  const guideT = act.phase === 0 ? Math.min(1, (act.left + 1) / (4 * 60)) : 1;
  const stick = seek(band, seat.x * guideT, seat.y * guideT, row.wobble, row.hist, cfg, w.tick, pose.instability);
  const breathe = pose.feet !== 'both' && wantBreath(band, w.time, cfg.period);
  return stickIntents(stick, feetFor(pose, breathe));
}

/** Clears mats this class added. */
export function teardown(w: World): void {
  sweep(w);
}

/** Builds the three classes from the same functions. */
export function poseClass(id: string, title: string) {
  return {
    id,
    title,
    seconds: posesFor(id).length * 28 + 4,
    setup: (w: World) => setup(w, id),
    step,
    teardown,
    score,
    bot,
  };
}

/** Pose Class A, for the catalogue. */
export const poseA = poseClass('pose-a', 'Pose Class');
