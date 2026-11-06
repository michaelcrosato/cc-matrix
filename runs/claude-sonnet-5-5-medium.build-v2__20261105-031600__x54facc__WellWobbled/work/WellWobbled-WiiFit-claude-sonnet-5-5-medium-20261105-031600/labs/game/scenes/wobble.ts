/**
 * @file The Wobble Model: the one verb. Each balancing body has a `wobble` component (the centre of balance in a unit
 * disc, its breath) and a `seat` component (the input it is given: lean, two feet). `stepWobble` is a pure function of
 * those and the tunables, so activities, bots, the page and tests all share it. Sim-side, time in whole steps.
 * @example
 * const s = newSeat(); const b = newWobble([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1, 1, 1]);
 * stepWobble(b, s, DEFAULT_PARAMS, 0); // b.x, b.y now moved by the model
 */
import { defineComponent } from '../../../engine/sim-api';

/** The input one seat gives the model each step. */
export interface Seat {
  lx: number;
  ly: number; // raw lean, -1..1 (x right, y forward)
  fl: number;
  fr: number; // feet, 0..1 analog
  gentle: boolean;
  act: boolean;
  mx: number;
  my: number; // mouse target, -1..1
}
/** The model's state. `sw` holds 3 phases then 3 rate ratios, then 3 spare. */
export interface Wobble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  lungs: number;
  calm: number;
  sync: number;
  guide: number;
  r: number;
  out: number;
  recover: number;
  topples: number;
  toppled: number;
  instMul: number;
  swayMul: number;
  dx: number;
  dy: number; // activity modifiers; disturbance accel
  seatNo: number;
  sw: number[];
  t: number;
}
/** Model parameters read from the settings. */
export interface Params {
  gain: number;
  instability: number;
  damping: number;
  noise: number;
  noiseRate: number;
  reach: number;
  period: number;
  calmEffect: number;
  assist: number;
}
export const DEFAULT_PARAMS: Params = { gain: 14, instability: 3, damping: 5, noise: 3.5, noiseRate: 0.15, reach: 0.9, period: 8, calmEffect: 0.5, assist: 0 }; // prettier-ignore
const DT = 1 / 60;
/** The seat's slew of the lean target, units/s. */
const SLEW = 4;

export const SEAT = defineComponent('seat', {
  description: 'The input a balancing body is given: lean, two feet, gentle, act, mouse target.',
  fields: {
    lx: { type: 'number', default: 0, description: 'Lean right.' },
    ly: { type: 'number', default: 0, description: 'Lean forward.' },
    fl: { type: 'number', default: 0, description: 'Left foot, analog.' },
    fr: { type: 'number', default: 0, description: 'Right foot, analog.' },
    gentle: { type: 'boolean', default: false, description: 'Gentle lean.' },
    act: { type: 'boolean', default: false, description: 'Act button.' },
    mx: { type: 'number', default: 0, description: 'Mouse lean x.' },
    my: { type: 'number', default: 0, description: 'Mouse lean y.' },
  },
});
export const WOBBLE = defineComponent('wobble', {
  description: 'The Wobble Model state of one body: centre of balance, velocity, breath, calm.',
  fields: {
    x: { type: 'number', default: 0, description: 'CoB x.' },
    y: { type: 'number', default: 0, description: 'CoB y.' },
    vx: { type: 'number', default: 0, description: 'Velocity x.' },
    vy: { type: 'number', default: 0, description: 'Velocity y.' },
    tx: { type: 'number', default: 0, description: 'Slewed target x.' },
    ty: { type: 'number', default: 0, description: 'Slewed target y.' },
    lungs: { type: 'number', default: 0, description: 'Lungs 0..1.' },
    calm: { type: 'number', default: 0, description: 'Calm 0..1.' },
    sync: { type: 'number', default: 0, description: 'Breath match 0..1.' },
    guide: { type: 'number', default: 0, description: 'Breath guide 0..1.' },
    r: { type: 'number', default: 0, description: 'Radius.' },
    out: { type: 'integer', default: 0, description: 'Steps past the edge.' },
    recover: { type: 'integer', default: 0, description: 'Steps of topple recovery left.' },
    topples: { type: 'integer', default: 0, description: 'Topples so far.' },
    toppled: { type: 'integer', default: 0, description: 'Set to 1 on the step of a topple.' },
    instMul: { type: 'number', default: 1, description: 'Instability multiplier.' },
    swayMul: { type: 'number', default: 1, description: 'Sway multiplier.' },
    dx: { type: 'number', default: 0, description: 'Disturbance accel x.' },
    dy: { type: 'number', default: 0, description: 'Disturbance accel y.' },
    seatNo: { type: 'integer', default: 0, description: 'Seat number.' },
    sw: {
      type: 'array',
      items: { type: 'number' },
      default: [0, 0, 0, 1, 1, 1, 0, 0, 0],
      description: 'Sway phases and rate ratios.',
    },
    t: { type: 'integer', default: 0, description: 'Steps lived.' },
  },
});

export const newSeat = (): Seat => ({ lx: 0, ly: 0, fl: 0, fr: 0, gentle: false, act: false, mx: 0, my: 0 });
/** A fresh state; `u` is nine uniform draws in 0..1 from the seat's named stream. */
export function newWobble(u: readonly number[], seatNo = 0): Wobble {
  const sw = [
    u[0] * 6.2832,
    u[1] * 6.2832,
    u[2] * 6.2832,
    0.8 + 0.45 * u[3],
    0.8 + 0.45 * u[4],
    0.8 + 0.45 * u[5],
    0,
    0,
    0,
  ];
  return { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, lungs: 0, calm: 0, sync: 0, guide: 0, r: 0, out: 0, recover: 0, topples: 0, toppled: 0, instMul: 1, swayMul: 1, dx: 0, dy: 0, seatNo, sw, t: 0 }; // prettier-ignore
}
/** Sway on one axis: three slow sines (plain Math.sin so the sim's math swap reaches it). */
export function sway(b: Wobble, tSec: number, rate: number, axis: number): number {
  const o = axis === 1 ? 1.7 : 0,
    s = b.sw;
  const w = 6.2832 * rate;
  return (Math.sin(w * s[3] * tSec + s[0] + o) + 0.6 * Math.sin(w * 1.7 * s[4] * tSec + s[1] + o * 2) + 0.3 * Math.sin(w * 3.1 * s[5] * tSec + s[2] + o * 3)) / 1.3; // prettier-ignore
}
const slew = (from: number, to: number) => from + Math.max(-SLEW * DT, Math.min(SLEW * DT, to - from));

/** Advances the model one step. `tick` is the shared clock. Returns true on the step of a topple. */
export function stepWobble(b: Wobble, s: Seat, p: Params, tick: number): boolean {
  b.t += 1;
  b.toppled = 0;
  const tSec = tick * DT;
  // breath: both feet fill the lungs; the guide swells and shrinks with the period
  const both = s.fl > 0.5 && s.fr > 0.5;
  b.lungs = Math.max(0, Math.min(1, b.lungs + ((both ? 1 : -1) * DT) / (p.period / 2)));
  b.guide = 0.5 - 0.5 * Math.cos((6.2832 * tSec) / p.period);
  b.sync += (1 - Math.abs(b.lungs - b.guide) - b.sync) * (DT / 1.5);
  const want = Math.max(0, Math.min(1, (b.sync - 0.6) / 0.3));
  b.calm += Math.max(-0.5 * DT, Math.min(0.5 * DT, want - b.calm));
  if (b.recover > 0) {
    b.recover -= 1;
    b.x *= 0.93;
    b.y *= 0.93;
    b.vx = 0;
    b.vy = 0;
  } else {
    let ix = s.lx + s.mx,
      iy = s.ly + s.my;
    const m = Math.hypot(ix, iy);
    if (m > 1) {
      ix /= m;
      iy /= m;
    }
    const k = (s.gentle ? 0.4 : 1) * p.reach;
    b.tx = slew(b.tx, ix * k);
    b.ty = slew(b.ty, iy * k);
    const sm = b.swayMul * (1 - 0.5 * p.assist) * p.noise * (1 - p.calmEffect * b.calm);
    const ax = p.gain * (b.tx - b.x) + p.instability * b.instMul * b.x + sm * sway(b, tSec, p.noiseRate, 0) + b.dx;
    const ay = p.gain * (b.ty - b.y) + p.instability * b.instMul * b.y + sm * sway(b, tSec, p.noiseRate, 1) + b.dy;
    const damp = Math.exp(-p.damping * DT);
    b.vx = (b.vx + ax * DT) * damp;
    b.vy = (b.vy + ay * DT) * damp;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
  }
  b.r = Math.hypot(b.x, b.y);
  b.out = b.r > 1 ? b.out + 1 : 0;
  if (b.out >= 6) {
    b.out = 0;
    b.topples += 1;
    b.toppled = 1;
    b.recover = 60;
    return true;
  }
  return false;
}
