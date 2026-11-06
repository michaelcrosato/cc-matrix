/**
 * @file The one verb. Centre of balance is a point in the unit disc. Each step slews the stick, then
 * accelerates toward it with instability, slow sway and breath. Past the rim for six steps the body topples,
 * stumbles, and recentres. It is never a game over.
 */
import { defineComponent, type World } from '../../../engine/sim-api';

/** Numbers the balance step reads. Sliders change them between steps. */
export interface BalanceCfg {
  gain: number;
  instability: number;
  damping: number;
  noise: number;
  noiseRate: number;
  reach: number;
  calmEffect: number;
  period: number;
  sens: number;
}

/** What the thumb, the feet and the activity are doing this step. */
export interface Stick {
  x: number;
  y: number;
  gentle: boolean;
  both: boolean;
  mdx: number;
  mdy: number;
  disturbX: number;
  disturbY: number;
  noiseScale: number;
  instabilityScale: number;
}

/** The centre of balance and the sway drawn once for the seat. */
export interface Wobble {
  seat: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sx: number;
  sy: number;
  mx: number;
  my: number;
  calm: number;
  lungs: number;
  sync: number;
  over: number;
  recover: number;
  topples: number;
  guide: number;
  m1: number;
  m2: number;
  m3: number;
  p1: number;
  p2: number;
  p3: number;
  n1: number;
  n2: number;
  n3: number;
  q1: number;
  q2: number;
  q3: number;
}

/** A ring buffer of recent centres, so a late thumb sees an old one. */
export interface Hist {
  i: number;
  n: number;
  xs: number[];
  ys: number[];
}

const field = (description: string, unit = '1') => ({ type: 'number' as const, default: 0, unit, description });

/** The component `wobble`: one balancing body. */
export const WOBBLE = defineComponent('wobble', {
  description: 'A seat’s centre of balance, its breath and the sway drawn for it.',
  fields: {
    seat: { type: 'integer', default: 0, description: 'Which mat this body stands on.' },
    x: field('Centre of balance, left to right. Past 1 is the rim.'),
    y: field('Centre of balance, back to forward.'),
    vx: field('Velocity along x.', '1/s'),
    vy: field('Velocity along y.', '1/s'),
    sx: field('The stick after the slew, left to right.'),
    sy: field('The stick after the slew, back to forward.'),
    mx: field('Mouse lean, decaying.'),
    my: field('Mouse lean, decaying.'),
    calm: field('How settled the breath is, 0 to 1.'),
    lungs: field('How full the breath is, 0 to 1.'),
    sync: field('How well the breath matches the guide, 0 to 1.'),
    over: { type: 'integer', default: 0, description: 'Steps in a row spent outside the disc.' },
    recover: { type: 'integer', default: 0, description: 'Steps left in a topple’s recentre.' },
    topples: { type: 'integer', default: 0, description: 'Topples since the count was cleared.' },
    guide: field('The breath guide, 0 empty to 1 full.'),
    m1: field('Sway rate ratio, x, first voice.'),
    m2: field('Sway rate ratio, x, second voice.'),
    m3: field('Sway rate ratio, x, third voice.'),
    p1: field('Sway phase, x, first voice.', 'rad'),
    p2: field('Sway phase, x, second voice.', 'rad'),
    p3: field('Sway phase, x, third voice.', 'rad'),
    n1: field('Sway rate ratio, y, first voice.'),
    n2: field('Sway rate ratio, y, second voice.'),
    n3: field('Sway rate ratio, y, third voice.'),
    q1: field('Sway phase, y, first voice.', 'rad'),
    q2: field('Sway phase, y, second voice.', 'rad'),
    q3: field('Sway phase, y, third voice.', 'rad'),
  },
});

/** The component `hist`: the centres a delayed thumb can still see. */
export const HIST = defineComponent('hist', {
  description: 'Recent centres of balance for one seat, oldest first in the ring.',
  fields: {
    i: { type: 'integer', default: 0, description: 'Where the next sample is written once the ring is full.' },
    n: { type: 'integer', default: 0, description: 'How many samples have been kept.' },
    xs: { type: 'array', items: { type: 'number' }, default: [], description: 'Recent centres, left to right.' },
    ys: { type: 'array', items: { type: 'number' }, default: [], description: 'Recent centres, back to forward.' },
  },
});

/** A number kept between lo and hi. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Moves `current` toward `target` by at most `maxDelta`. */
export function slew(current: number, target: number, maxDelta: number): number {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

/** The slow sway on one axis. Phases come from the seat, never from Math.random. */
export function swayNoise(
  t: number,
  rate: number,
  m1: number,
  m2: number,
  m3: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const a = Math.sin(2 * Math.PI * rate * m1 * t + p1);
  const b = 0.6 * Math.sin(2 * Math.PI * rate * 1.7 * m2 * t + p2);
  const c = 0.3 * Math.sin(2 * Math.PI * rate * 3.1 * m3 * t + p3);
  return (a + b + c) / 1.3;
}

/** Draws the six ratios and phases for a seat from the stream `sway`. */
export function drawSway(w: World): void {
  const rng = w.rng('sway');
  const ratio = () => rng.range(0.8, 1.25);
  const phase = () => rng.range(0, Math.PI * 2);
  const body = w.spawn({
    wobble: {
      m1: ratio(),
      m2: ratio(),
      m3: ratio(),
      p1: phase(),
      p2: phase(),
      p3: phase(),
      n1: ratio(),
      n2: ratio(),
      n3: ratio(),
      q1: phase(),
      q2: phase(),
      q3: phase(),
    },
    hist: { xs: [], ys: [] },
  });
  void body;
}

/** Clears the motion and the breath, and keeps the sway. A new activity starts here. */
export function resetBalance(b: Wobble, hist: Hist): void {
  b.x = 0;
  b.y = 0;
  b.vx = 0;
  b.vy = 0;
  b.sx = 0;
  b.sy = 0;
  b.mx = 0;
  b.my = 0;
  b.calm = 0;
  b.lungs = 0;
  b.sync = 0;
  b.over = 0;
  b.recover = 0;
  b.topples = 0;
  b.guide = 0;
  hist.i = 0;
  hist.n = 0;
  hist.xs.length = 0;
  hist.ys.length = 0;
}

/** Remembers a centre. The ring holds 24, which covers the sloppy thumb’s delay. */
export function remember(hist: Hist, x: number, y: number): void {
  const cap = 24;
  if (hist.xs.length < cap) {
    hist.xs.push(x);
    hist.ys.push(y);
  } else {
    hist.xs[hist.i] = x;
    hist.ys[hist.i] = y;
    hist.i = (hist.i + 1) % cap;
  }
  hist.n += 1;
}

/** The centre `delay` steps ago, or the oldest one we have. */
export function recall(hist: Hist, delay: number): { x: number; y: number } {
  const len = hist.xs.length;
  if (len === 0) return { x: 0, y: 0 };
  const age = Math.min(Math.max(0, delay), len - 1);
  const newest = len < 24 ? len - 1 : (hist.i + 24 - 1) % 24;
  const at = (newest - age + len) % len;
  return { x: hist.xs[at] ?? 0, y: hist.ys[at] ?? 0 };
}

/** One balance step. `t` and `dt` are sim time. A topple recentres over one second and counts once. */
export function stepBalance(b: Wobble, stick: Stick, cfg: BalanceCfg, t: number, dt: number): void {
  const period = Math.max(0.25, cfg.period);
  const phase = (t % period) / period;
  const rising = phase < 0.5;
  b.guide = rising ? phase * 2 : (1 - phase) * 2;
  const fill = dt / (period * 0.5);
  if (stick.both) b.lungs = Math.min(1, b.lungs + fill);
  else b.lungs = Math.max(0, b.lungs - fill);
  const instant = 1 - Math.abs(b.lungs - b.guide);
  const participating = stick.both || b.lungs > 0.04;
  const toward = participating ? instant : 0;
  const blend = Math.min(1, dt / (participating ? 0.6 : 2));
  b.sync += (toward - b.sync) * blend;
  b.calm += (b.sync - b.calm) * Math.min(1, dt / 1.2);

  if (b.recover > 0) {
    const left = b.recover;
    b.x *= (left - 1) / left;
    b.y *= (left - 1) / left;
    b.vx = 0;
    b.vy = 0;
    b.recover -= 1;
    b.over = 0;
    return;
  }

  const decay = Math.exp(-dt / 0.6);
  b.mx = (b.mx + stick.mdx) * decay;
  b.my = (b.my + stick.mdy) * decay;
  const rawX = clamp(stick.x + b.mx, -1, 1);
  const rawY = clamp(stick.y + b.my, -1, 1);
  b.sx = slew(b.sx, rawX, 4 * dt);
  b.sy = slew(b.sy, rawY, 4 * dt);
  const scale = (stick.gentle ? 0.4 : 1) * cfg.reach;
  let tx = b.sx * scale;
  let ty = b.sy * scale;
  const len = Math.hypot(tx, ty);
  if (len > 1) {
    tx /= len;
    ty /= len;
  }
  const quiet = 1 - cfg.calmEffect * clamp(b.calm, 0, 1);
  const amp = cfg.noise * stick.noiseScale * quiet;
  const nx = swayNoise(t, cfg.noiseRate, b.m1, b.m2, b.m3, b.p1, b.p2, b.p3) * amp + stick.disturbX;
  const ny = swayNoise(t, cfg.noiseRate, b.n1, b.n2, b.n3, b.q1, b.q2, b.q3) * amp + stick.disturbY;
  const inst = cfg.instability * stick.instabilityScale;
  const ax = cfg.gain * (tx - b.x) + inst * b.x + nx;
  const ay = cfg.gain * (ty - b.y) + inst * b.y + ny;
  b.vx += ax * dt;
  b.vy += ay * dt;
  const damp = Math.exp(-cfg.damping * dt);
  b.vx *= damp;
  b.vy *= damp;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (Math.hypot(b.x, b.y) > 1) b.over += 1;
  else b.over = 0;
  if (b.over >= 6) {
    b.topples += 1;
    b.recover = 60;
    b.over = 0;
  }
}

/** True when the centre sits inside a ring of `radius`. */
export function inRing(b: Wobble, radius: number): boolean {
  return Math.hypot(b.x, b.y) <= radius;
}
