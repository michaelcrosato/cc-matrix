/**
 * @file Seat input shared by the island and the hub round: the model parameters from the settings, the guest's seat from the
 * step's intents (lean, feet, gentle, act, mouse delta, garden pointer) and the Wobble Model stepping for every seat. Sim-side.
 * @example
 * paramsOf(w).gain; // 14
 */
import type { Intents } from '../../../engine/sim-api';
import type { W } from './events/types';
import { guestOf } from './events/runner';
import { DEFAULT_PARAMS, stepWobble, type Params } from './wobble';

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));
export const val = (it: Intents, k: string): number => {
  const v = (it as unknown as Record<string, unknown>)[k];
  return typeof v === 'number' ? v : v ? 1 : 0;
};
export const arr2 = (it: Intents, k: string): [number, number] => {
  const v = (it as unknown as Record<string, unknown>)[k];
  return Array.isArray(v) ? [Number(v[0]) || 0, Number(v[1]) || 0] : [0, 0];
};

/** Model parameters from the settings. */
export function paramsOf(w: W): Params {
  const g = (k: string) => w.settings.get<number>(`game.${k}`);
  return { ...DEFAULT_PARAMS, gain: g('wobble.gain'), instability: g('wobble.instability'), damping: g('wobble.damping'), noise: g('wobble.noise'), noiseRate: g('wobble.noiseRate'), reach: g('wobble.reach'), period: g('breath.period'), calmEffect: g('breath.calmEffect'), assist: g('assist') }; // prettier-ignore
}
/** Writes the guest's seat from the step's intents (a bot overrides it afterwards). */
/** Latches presses of the island buttons into counters on `flow`, so a slow page frame never misses one. */
export function latchButtons(w: W, it: Intents): void {
  const f = w.query('flow')[0].flow;
  const now =
    (val(it, 'game:use') > 0.5 ? 1 : 0) | (val(it, 'game:plan') > 0.5 ? 2 : 0) | (val(it, 'game:wave') > 0.5 ? 4 : 0);
  const rise = now & ~f.held;
  if (rise & 1) f.nUse += 1;
  if (rise & 2) f.nPlan += 1;
  if (rise & 4) f.nWave += 1;
  f.held = now;
}
export function readSeatFrom(w: W, it: Intents): void {
  latchButtons(w, it);
  const g = guestOf(w);
  if (!g) return;
  const s = g.seat;
  s.lx = val(it, 'game:r') - val(it, 'game:l');
  s.ly = val(it, 'game:f') - val(it, 'game:b');
  s.fl = val(it, 'game:fl');
  s.fr = val(it, 'game:fr');
  s.gentle = val(it, 'game:gentle') > 0;
  s.act = val(it, 'game:act') > 0;
  const [qx, qy] = arr2(it, 'game:pointer'); // the garden: the pointer's place on the tray is the tilt
  if (qx !== 0 || qy !== 0) {
    s.mx = clamp1(qx);
    s.my = clamp1(-qy);
    return;
  }
  const [dx, dy] = arr2(it, 'game:mouse');
  s.mx = Math.max(-1, Math.min(1, s.mx * Math.exp(-1 / 60 / 0.6) + dx * 0.004));
  s.my = Math.max(-1, Math.min(1, s.my * Math.exp(-1 / 60 / 0.6) - dy * 0.004)); // prettier-ignore
}
export function stepSeatsOf(w: W): void {
  const p = paramsOf(w);
  const noTopple = w.settings.get<boolean>('game.noTopple');
  for (const e of w.query('seat', 'wobble')) {
    stepWobble(e.wobble, e.seat, p, w.tick);
    if (noTopple && e.wobble.recover > 0) e.wobble.recover = 0;
    if (e.wobble.toppled) w.emit('topple', { seat: e.wobble.seatNo, r: e.wobble.r });
  }
}
