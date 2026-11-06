/**
 * @file Drives an actor's clip layer directly: one full-body clip (a scrubbed strip or a loop) and, on top, the four
 * additive leans, written as plain slots, so the sim scrubs them each step. `seekClip` only reaches the top clip, so it
 * could not do two axes; the layer's own `play` removes what a full-body clip covers, so the leans always sit above it.
 */
import type { World } from '../../../engine/sim-api';

interface Slot {
  clip: string;
  t: number;
  w: number;
  rate: number;
  stopping: number;
  loco: boolean;
  play: Record<string, unknown>;
}
type ClipEntity = { clips?: { state: { slots: Slot[] } } };

const LEANS = ['RETREAT/LeanR', 'RETREAT/LeanL', 'RETREAT/LeanF', 'RETREAT/LeanB'];

const slotsOf = (w: World<never> | World, id: number): Slot[] | null =>
  ((w as World).get(id) as unknown as ClipEntity | undefined)?.clips?.state.slots ?? null;

const leanSlot = (clip: string): Slot => ({
  clip, t: 0, w: 1, rate: 0, stopping: 0, loco: false,
  play: { speed: 0, hold: true, walk: true, loop: false, additive: true, fade: 0 },
}); // prettier-ignore

/** Scrubs the leans to the CoB: `x` right, `y` forward, each −1 to 1. */
export function setLean(w: object, id: number, x: number, y: number): void {
  const slots = slotsOf(w as World, id);
  if (!slots) return;
  if (!slots.some((s) => s.clip === LEANS[0])) slots.push(...LEANS.map(leanSlot));
  for (const slot of slots) {
    if (slot.clip === LEANS[0]) slot.t = Math.max(0, Math.min(1, x));
    else if (slot.clip === LEANS[1]) slot.t = Math.max(0, Math.min(1, -x));
    else if (slot.clip === LEANS[2]) slot.t = Math.max(0, Math.min(1, y));
    else if (slot.clip === LEANS[3]) slot.t = Math.max(0, Math.min(1, -y));
  }
}

/** The clip now under the leans, or null. */
function baseOf(slots: Slot[]): Slot | null {
  for (let k = slots.length - 1; k >= 0; k--) {
    if (!slots[k].play.additive && !slots[k].stopping) return slots[k];
  }
  return null;
}

/** Puts `clip` under the leans, or finds it there. Fades from what was there. */
function ensure(slots: Slot[], clip: string, play: Record<string, unknown>): Slot {
  const base = baseOf(slots);
  if (base?.clip === clip && !!base.play.mirror === !!play.mirror) return base;
  if (base) base.stopping = 0.2;
  const slot: Slot = { clip, t: 0, w: 0, rate: 0, stopping: 0, loco: false, play };
  const at = slots.findIndex((s) => s.play.additive);
  if (at < 0) slots.push(slot);
  else slots.splice(at, 0, slot);
  return slot;
}

/** Scrubs a strip: `clip` as `RETREAT/Heron`, `t` from 0 stood to 1 in the pose. */
export function setPose(w: object, id: number, clip: string, t: number, mirror = false): void {
  const slots = slotsOf(w as World, id);
  if (!slots) return;
  const slot = ensure(slots, clip, { speed: 0, hold: true, walk: true, loop: false, fade: 0.2, out: 0.2, mirror });
  slot.t = t;
}

/** Plays a loop under the leans at `speed`; the same call again changes nothing but the speed. */
export function setLoop(w: object, id: number, clip: string, speed = 1): void {
  const slots = slotsOf(w as World, id);
  if (!slots) return;
  ensure(slots, clip, { speed, walk: true, loop: true, fade: 0.25, out: 0.25 }).play.speed = speed;
}

/** Plays a clip once and holds its end. */
export function setOnce(w: object, id: number, clip: string): void {
  const slots = slotsOf(w as World, id);
  if (!slots) return;
  ensure(slots, clip, { speed: 1, walk: true, loop: false, hold: true, fade: 0.2, out: 0.25 });
}

/** Lets the body's own animation back: the base clip fades, the leans go to zero. */
export function clearBody(w: object, id: number): void {
  const slots = slotsOf(w as World, id);
  if (!slots) return;
  for (const slot of slots) {
    if (!slot.play.additive) slot.stopping = slot.stopping || 0.25;
    else slot.t = 0;
  }
}
