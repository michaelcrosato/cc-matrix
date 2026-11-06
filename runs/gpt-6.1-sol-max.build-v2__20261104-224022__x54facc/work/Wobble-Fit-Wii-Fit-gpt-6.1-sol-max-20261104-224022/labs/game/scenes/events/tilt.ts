/** @file The five finale movements: storm, guests, carts, centre stone and dawn. */
import { balanceBot, clamp, emptyLean } from '../wobble';
import type { ActivityRun, EventConfig, Guide } from './types';
import type { Lean, Wobble } from '../wobble';
export const TILT_STEPS = [0, 20, 95, 140, 200, 240];
export function tiltGuide(r: ActivityRun): Guide {
  const t = r.tick / 60;
  const found = TILT_STEPS.findIndex((end, i) => i > 0 && t < end) - 1;
  const phase = found < 0 ? 4 : Math.min(4, found);
  return {
    x: phase === 1 ? 0.35 : 0,
    y: 0,
    ring: phase === 3 ? 0.22 - 0.07 * ((t - 140) / 60) : 0.3,
    title: ['The Storm', 'Everyone East', 'A small counterweight', 'The Centre Stone', 'Dawn'][phase],
    instruction: [
      'The island is six degrees out of true. Calm is mandatory.',
      'Hold both feet for a calm call. Release. Lead the guests east with your lean.',
      'Alternate feet to crank. Lean against the slope.',
      'Your dot is the island. Keep it in the ring. Breathe through the storm.',
      'Everything is balanced now. Please do not tell anyone about the rock.',
    ][phase],
    pose: phase === 1 ? 'CalmCall' : phase === 2 ? 'Crank' : 'Lighthouse',
    foot: 0,
  };
}
export function stepTilt(r: ActivityRun, w: Wobble, input: Lean, c: EventConfig): void {
  r.phase = Math.max(0, Math.min(4, TILT_STEPS.findIndex((end, i) => i > 0 && r.tick / 60 < end) - 1));
  const g = tiltGuide(r),
    both = input.l > 0.5 && input.r > 0.5;
  if (r.phase === 0) r.tilt = 6 + (r.tick / 1200) * 2;
  if (r.phase === 1) {
    if (both) r.hold++;
    if (!both && r.lastL && r.lastR && r.hold >= 120) {
      r.count = Math.min(12 - r.guests, r.count + 3);
      r.hold = 0;
    }
    if (r.count > 0 && input.x > 0.15) {
      r.progress += input.x / 60;
      if (r.progress >= 3) {
        r.guests += r.count;
        r.count = 0;
        r.progress = 0;
      }
    }
    r.tilt = 8 + c.get('tilt.rate') * (r.tick / 60 - 20) - r.guests * 0.5;
  }
  if (r.phase === 2) r.tilt += c.get('tilt.rate') / 60;
  if (r.phase === 2 && ((input.l > 0.5 && !r.lastL) || (input.r > 0.5 && !r.lastR))) {
    r.tilt = Math.max(2, r.tilt - 0.015);
    r.count++;
  }
  if (r.phase === 3) {
    r.total += Math.hypot(w.x, w.y) < g.ring ? 1 : 0;
    r.samples++;
    r.breath += w.sync;
    r.tilt = Math.max(0.1, 4 * (1 - (r.tick / 60 - 140) / 60) + Math.hypot(w.x, w.y) * 7);
  }
  if (r.phase === 4) r.tilt *= 0.99;
  r.lastL = input.l > 0.5;
  r.lastR = input.r > 0.5;
  r.score = Math.round(
    clamp(
      ((r.guests / 12) * 0.25 +
        (r.samples ? r.total / r.samples : 0) * 0.55 +
        (r.samples ? r.breath / r.samples : 0) * 0.2) *
        1000,
      0,
      1000,
    ),
  );
}
export function tiltBot(r: ActivityRun, w: Wobble, c: EventConfig, kind: string): Lean {
  if (kind === 'idle') return emptyLean();
  const g = tiltGuide(r),
    input = balanceBot(w, r.tick, c.wobble, [g.x, g.y], kind);
  if (r.phase === 1) {
    input.l = input.r = r.tick % 360 < 130 ? 1 : 0;
    input.x = 0.7;
  }
  if (r.phase === 2) {
    input.l = r.tick % 30 < 4 ? 1 : 0;
    input.r = r.tick % 30 >= 15 && r.tick % 30 < 19 ? 1 : 0;
  }
  return input;
}
