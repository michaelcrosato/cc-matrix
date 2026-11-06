/**
 * @file The four thumbs. Nobody here can hold a pad, so these write the same lean a player would.
 * Perfect is immediate. Human-like is 250 ms late. Sloppy is 350 ms late. Idle holds nothing.
 * Off-centre seats need a feedforward term, or a late thumb settles short of the ring.
 */
import type { Intents } from '../../../engine/sim-api';
import { type BalanceCfg, type Hist, type Wobble, clamp, recall } from './wobble';

/** Which thumb is playing. */
export type Band = 'perfect' | 'human' | 'sloppy' | 'idle';

/** Delay in steps, proportional gain, and jitter width. */
export function bandTune(band: Band): { delay: number; k: number; jitter: number } {
  if (band === 'perfect') return { delay: 0, k: 3, jitter: 0 };
  if (band === 'human') return { delay: 15, k: 1.2, jitter: 0.04 };
  if (band === 'sloppy') return { delay: 21, k: 0.8, jitter: 0.06 };
  return { delay: 0, k: 0, jitter: 0 };
}

/** The breath guide at sim time `t`, the same triangle the balance step draws. */
export function guideAt(t: number, period: number): number {
  const p = Math.max(0.25, period);
  const phase = (((t % p) + p) % p) / p;
  return phase < 0.5 ? phase * 2 : (1 - phase) * 2;
}

/** True while this thumb means to be breathing in. Idle never does. Delay is the late thumb. */
export function wantBreath(band: Band, t: number, period: number): boolean {
  if (band === 'idle') return false;
  const tune = bandTune(band);
  const when = Math.max(0, t - tune.delay / 60);
  const p = Math.max(0.25, period);
  const phase = (when % p) / p;
  return phase < 0.5;
}

/** A deterministic wobble so the same step always jitters the same way. Not Math.random. */
function jitter(amount: number, tick: number, axis: number): number {
  if (amount === 0) return 0;
  return amount * Math.sin(tick * 1.7 + axis * 4.1);
}

/**
 * The stick that holds `desired` on this seat. `instScale` matches the activity's instability.
 * The hold term is zero at the centre, so the still-ring model is unchanged.
 */
export function seek(
  band: Band,
  desiredX: number,
  desiredY: number,
  body: Wobble,
  hist: Hist,
  cfg: BalanceCfg,
  tick: number,
  instScale = 1,
): { x: number; y: number } {
  if (band === 'idle') return { x: 0, y: 0 };
  const tune = bandTune(band);
  const seen = recall(hist, tune.delay);
  const inst = cfg.instability * instScale;
  const denom = cfg.gain * cfg.reach;
  const hold = denom === 0 ? 0 : (cfg.gain - inst) / denom;
  const x = hold * desiredX + tune.k * (desiredX - seen.x) + jitter(tune.jitter, tick, 0);
  const y = hold * desiredY + tune.k * (desiredY - seen.y) + jitter(tune.jitter, tick, 1);
  return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
}

/** Turns a stick and the feet into the intents the balance map reads. */
export function stickIntents(
  stick: { x: number; y: number },
  feet: { l?: boolean; r?: boolean; both?: boolean },
): Intents {
  const out: Record<string, number> = {};
  if (stick.x >= 0) out['game:r'] = clamp(stick.x, 0, 1);
  else out['game:l'] = clamp(-stick.x, 0, 1);
  if (stick.y >= 0) out['game:f'] = clamp(stick.y, 0, 1);
  else out['game:b'] = clamp(-stick.y, 0, 1);
  if (feet.both || (feet.l && feet.r)) {
    out['game:fl'] = 1;
    out['game:fr'] = 1;
  } else {
    if (feet.l) out['game:fl'] = 1;
    if (feet.r) out['game:fr'] = 1;
  }
  return out as Intents;
}
