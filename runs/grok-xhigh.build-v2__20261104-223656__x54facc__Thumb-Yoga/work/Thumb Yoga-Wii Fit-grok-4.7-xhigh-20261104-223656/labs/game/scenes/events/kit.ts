/**
 * @file Shared reading of a seat, the live tunables, and one call into the balance step.
 * Activities use this so the model stays in one place.
 */
import type { Intents, World } from '../../../../engine/sim-api';
import { type Act, type Flow, part } from '../state';
import { type BalanceCfg, type Hist, type Stick, type Wobble, remember, stepBalance } from '../wobble';

/** What one seat did this step. */
export interface Seat {
  x: number;
  y: number;
  fl: number;
  fr: number;
  both: boolean;
  act: number;
  gentle: boolean;
  mdx: number;
  mdy: number;
  pointer: boolean;
  px: number;
  py: number;
}

/** A finite number from a custom intent, or 0. */
export function num(intents: Intents, key: string): number {
  const v = (intents as Record<string, unknown>)[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Whether the button name is held. */
export function held(intents: Intents, name: string): boolean {
  return Array.isArray(intents.b) && intents.b.includes(name);
}

/** A pair stored as an array intent. */
function pair(intents: Intents, key: string): { ok: boolean; x: number; y: number } {
  const v = (intents as Record<string, unknown>)[key];
  if (!Array.isArray(v) || v.length < 2) return { ok: false, x: 0, y: 0 };
  const x = typeof v[0] === 'number' && Number.isFinite(v[0]) ? v[0] : 0;
  const y = typeof v[1] === 'number' && Number.isFinite(v[1]) ? v[1] : 0;
  return { ok: true, x, y };
}

/** Seat 0 reads the balance map. Later seats read `game:seats` in groups of four: x, y, fl, fr. */
export function readSeat(intents: Intents, seat = 0): Seat {
  const packed = (intents as Record<string, unknown>)['game:seats'];
  if (seat > 0 && Array.isArray(packed)) {
    const at = (k: number) => {
      const v = packed[seat * 4 + k];
      return typeof v === 'number' && Number.isFinite(v) ? v : 0;
    };
    const fl = at(2);
    const fr = at(3);
    return {
      x: at(0),
      y: at(1),
      fl,
      fr,
      both: fl > 0.5 && fr > 0.5,
      act: 0,
      gentle: false,
      mdx: 0,
      mdy: 0,
      pointer: false,
      px: 0,
      py: 0,
    };
  }
  const breath = held(intents, 'breathe');
  const fl = Math.max(num(intents, 'game:fl'), held(intents, 'footl') || breath ? 1 : 0);
  const fr = Math.max(num(intents, 'game:fr'), held(intents, 'footr') || breath ? 1 : 0);
  const mouse = pair(intents, 'game:mouse');
  const pointer = pair(intents, 'game:pointer');
  return {
    x: num(intents, 'game:r') - num(intents, 'game:l'),
    y: num(intents, 'game:f') - num(intents, 'game:b'),
    fl,
    fr,
    both: fl > 0.5 && fr > 0.5,
    act: Math.max(num(intents, 'game:act'), held(intents, 'act') ? 1 : 0),
    gentle: held(intents, 'gentle') || num(intents, 'game:g') > 0.5,
    mdx: mouse.x,
    mdy: mouse.y,
    pointer: pointer.ok,
    px: pointer.x,
    py: pointer.y,
  };
}

/** The balance numbers, including steadier hands. Attract mode quiets the sway so the demo can cheat. */
export function cfgOf(w: World): BalanceCfg {
  const g = (path: string) => Number(w.settings.get(path));
  const assist = g('game.assist') > 0.5 ? 0.5 : 1;
  const cheat = String(w.settings.get('game.auto')) === 'attract' ? 0.25 : 1;
  return {
    gain: g('game.wobble.gain'),
    instability: g('game.wobble.instability'),
    damping: g('game.wobble.damping'),
    noise: g('game.wobble.noise') * assist * cheat,
    noiseRate: g('game.wobble.noiseRate'),
    reach: g('game.wobble.reach'),
    calmEffect: g('game.breath.calmEffect'),
    period: g('game.breath.period'),
    sens: g('game.mouse.sens'),
  };
}

/** The wobble and its history for a seat. */
export function rowOf(w: World, seat: number): { wobble: Wobble; hist: Hist } {
  const rows = w.query('wobble') as unknown as { wobble: Wobble; hist: Hist }[];
  for (const row of rows) if (row.wobble.seat === seat && row.hist) return row;
  throw new Error(`no seat ${seat}`);
}

/** Extra forces an activity adds for one step. */
export interface Push {
  noise?: number;
  inst?: number;
  dx?: number;
  dy?: number;
  seat?: number;
}

/** One balance step for a seat, then the centre is remembered for a late thumb. */
export function apply(w: World, intents: Intents, push: Push = {}): { body: Wobble; seat: Seat } {
  const seatIndex = push.seat ?? 0;
  const row = rowOf(w, seatIndex);
  const seat = readSeat(intents, seatIndex);
  const cfg = cfgOf(w);
  const stick: Stick = {
    x: seat.x,
    y: seat.y,
    gentle: seat.gentle,
    both: seat.both,
    mdx: seat.mdx * cfg.sens,
    mdy: seat.mdy * cfg.sens,
    disturbX: push.dx ?? 0,
    disturbY: push.dy ?? 0,
    noiseScale: push.noise ?? 1,
    instabilityScale: push.inst ?? 1,
  };
  stepBalance(row.wobble, stick, cfg, w.time, w.dt);
  remember(row.hist, row.wobble.x, row.wobble.y);
  return { body: row.wobble, seat };
}

/** The flow entity. */
export function flowOf(w: World): Flow {
  return part<Flow>(w, 'flow');
}

/** The activity board. */
export function actOf(w: World): Act {
  return part<Act>(w, 'act');
}

/** Removes every entity an activity marked. */
export function sweep(w: World): void {
  for (const row of w.query('made') as unknown as { id: number }[]) w.despawn(row.id);
}
