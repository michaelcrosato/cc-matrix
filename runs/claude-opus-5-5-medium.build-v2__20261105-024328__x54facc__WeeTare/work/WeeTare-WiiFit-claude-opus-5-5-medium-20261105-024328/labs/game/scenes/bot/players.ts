/**
 * @file The four players who stand in for a human (PLAN.md section 16) and the CPU guests. Each is the same thumb: it
 * reads the CoB late, adds jitter, and steers toward an activity's aim. An activity's `bot` answers with an `Order`: what
 * it wants the CoB or the feet to do. Rhythm activities read `skill.timing` as their timing error.
 */
import { seatOf, type SeatE, type W } from '../types';
import { gameNumber } from '../settings';

/** How a thumb plays. */
export interface Skill {
  readonly name: string;
  /** Reading delay, steps; proportional gain; stick jitter; timing error, steps; reaction chance scale. */
  readonly delay: number;
  readonly gain: number;
  readonly jitter: number;
  readonly timing: number;
  readonly idle?: boolean;
  readonly random?: boolean;
}

export const SKILLS: Readonly<Record<string, Skill>> = {
  perfect: { name: 'perfect', delay: 0, gain: 3, jitter: 0, timing: 0 },
  human: { name: 'human', delay: 15, gain: 1.2, jitter: 0.04, timing: 4 },
  sloppy: { name: 'sloppy', delay: 21, gain: 0.8, jitter: 0.06, timing: 7 },
  idle: { name: 'idle', delay: 0, gain: 0, jitter: 0, timing: 0, idle: true },
  random: { name: 'random', delay: 0, gain: 0, jitter: 0, timing: 0, random: true },
  cpu: { name: 'cpu', delay: 12, gain: 1.3, jitter: 0.04, timing: 3 },
};

/** What an activity's bot wants this step. */
export interface Order {
  /** Where the CoB should be: the thumb closes the loop on it. */
  aim?: readonly [number, number];
  /** Or the raw stick. */
  stick?: readonly [number, number];
  l?: number;
  r?: number;
  act?: boolean;
  /** Skips the thumb's jitter. */
  raw?: boolean;
  /** Scales the thumb's correction: a rhythm you know you play mostly open-loop. */
  trust?: number;
}

/** The stick that, without noise, settles the CoB on `aim`. */
function feedForward(w: W, aim: number): number {
  const gain = gameNumber(w, 'game.wobble.gain');
  const inst = gameNumber(w, 'game.wobble.instability');
  return (aim * (gain - inst)) / gain / gameNumber(w, 'game.wobble.reach');
}

/** Writes the order into the seat's input, through the thumb of `skill`. */
export function applyOrder(w: W, e: SeatE, skill: Skill, order: Order): void {
  const { seat, wobble } = e;
  seat.hx.push(wobble.x);
  seat.hy.push(wobble.y);
  while (seat.hx.length > skill.delay + 1) {
    seat.hx.shift();
    seat.hy.shift();
  }
  const rng = w.rng('bot');
  if (skill.idle) {
    Object.assign(seat.input, { x: 0, y: 0, l: 0, r: 0, act: false, gentle: false });
    return;
  }
  if (skill.random) {
    Object.assign(seat.input, {
      x: rng.range(-1, 1), y: rng.range(-1, 1), l: rng.chance(0.5) ? 1 : 0, r: rng.chance(0.5) ? 1 : 0,
      act: rng.chance(0.05), gentle: rng.chance(0.1),
    }); // prettier-ignore
    return;
  }
  let x = 0;
  let y = 0;
  if (order.aim) {
    const [ax, ay] = order.aim;
    const gain = skill.gain * (order.trust ?? 1);
    x = feedForward(w, ax) + gain * (ax - seat.hx[0]);
    y = feedForward(w, ay) + gain * (ay - seat.hy[0]);
  } else if (order.stick) [x, y] = order.stick;
  if (!order.raw) {
    x += rng.range(-1, 1) * skill.jitter;
    y += rng.range(-1, 1) * skill.jitter;
  }
  const len = Math.hypot(x, y);
  if (len > 1) [x, y] = [x / len, y / len];
  Object.assign(seat.input, { x, y, l: order.l ?? 0, r: order.r ?? 0, act: order.act ?? false, gentle: false });
}

/** The lungs the guide wants: hold both feet while breathing in. Late by the thumb's timing. */
export function breathFeet(w: W, skill: Skill, period = gameNumber(w, 'game.breath.period')): number {
  const steps = Math.round(period * 60);
  return (w.tick + steps - Math.round(skill.timing)) % steps < steps / 2 ? 1 : 0;
}

/** A seat by index, for a bot. */
export const botSeat = seatOf;
