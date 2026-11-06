/** @file The shared balance integrator, breath and delayed-thumb test pilots. Pure sim data. */
export type Lean = { x: number; y: number; l: number; r: number; act: boolean };
export type Wobble = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  calm: number;
  lungs: number;
  sync: number;
  guide: number;
  topples: number;
  edge: number;
  recover: number;
  phases: number[];
  history: number[][];
};
export type WobbleConfig = {
  gain: number;
  instability: number;
  damping: number;
  noise: number;
  noiseRate: number;
  reach: number;
  period: number;
  calmEffect: number;
};
export const DEFAULT_WOBBLE: WobbleConfig = {
  gain: 14,
  instability: 3,
  damping: 5,
  noise: 3.5,
  noiseRate: 0.15,
  reach: 0.9,
  period: 8,
  calmEffect: 0.5,
};
export const clamp = (v: number, a = -1, b = 1) => Math.max(a, Math.min(b, v));
export const emptyLean = (): Lean => ({ x: 0, y: 0, l: 0, r: 0, act: false });
export function makeWobble(phases: number[]): Wobble {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    calm: 0,
    lungs: 0,
    sync: 0,
    guide: 0,
    topples: 0,
    edge: 0,
    recover: 0,
    phases,
    history: [],
  };
}
export function sway(w: Wobble, t: number, cfg: WobbleConfig, axis: number): number {
  const p = axis * 3,
    a = t * Math.PI * 2 * cfg.noiseRate;
  return (
    (Math.sin(a + w.phases[p]) +
      0.6 * Math.sin(a * 1.7 + w.phases[p + 1]) +
      0.3 * Math.sin(a * 3.1 + w.phases[p + 2])) /
    1.3
  );
}
export function stepWobble(w: Wobble, input: Lean, tick: number, c: WobbleConfig, dt = 1 / 60): boolean {
  const t = tick / 60;
  w.guide = 0.5 - 0.5 * Math.cos((t * Math.PI * 2) / c.period);
  const inhale = input.l >= 0.5 && input.r >= 0.5;
  w.lungs = clamp(w.lungs + ((inhale ? 2 : -2) * dt) / c.period, 0, 1);
  const match = 1 - Math.abs(w.lungs - w.guide);
  w.sync += ((inhale || w.lungs > 0.02 ? match : 0) - w.sync) * dt * 1.4;
  w.calm += (Math.max(0, w.sync * 1.3 - 0.3) - w.calm) * dt * 0.7;
  const slew = 4 * dt;
  w.tx += clamp(input.x - w.tx, -slew, slew);
  w.ty += clamp(input.y - w.ty, -slew, slew);
  const norm = Math.max(1, Math.hypot(w.tx, w.ty));
  for (const axis of [0, 1]) {
    const pos = axis === 0 ? w.x : w.y,
      vel = axis === 0 ? w.vx : w.vy;
    const target = ((axis === 0 ? w.tx : w.ty) * c.reach) / norm;
    const a =
      c.gain * (target - pos) + c.instability * pos + sway(w, t, c, axis) * c.noise * (1 - c.calmEffect * w.calm);
    const v = (vel + a * dt) * Math.exp(-c.damping * dt);
    if (axis === 0) {
      w.vx = v;
      w.x += v * dt;
    } else {
      w.vy = v;
      w.y += v * dt;
    }
  }
  if (w.recover > 0) {
    w.recover--;
    w.x *= 0.94;
    w.y *= 0.94;
    w.vx *= 0.7;
    w.vy *= 0.7;
  }
  w.edge = Math.hypot(w.x, w.y) > 1 ? w.edge + 1 : 0;
  if (w.edge >= 6 && w.recover === 0) {
    w.topples++;
    w.recover = 60;
    w.edge = 0;
    return true;
  }
  return false;
}
export function balanceBot(w: Wobble, tick: number, c: WobbleConfig, target: [number, number], kind = 'perfect'): Lean {
  const delay = kind === 'human' ? 15 : kind === 'sloppy' ? 21 : 0;
  const gain = kind === 'human' ? 1.2 : kind === 'sloppy' ? 0.8 : 3;
  const jitter = kind === 'human' ? 0.04 : kind === 'sloppy' ? 0.06 : 0;
  w.history.push([w.x, w.y]);
  if (w.history.length > 30) w.history.shift();
  const old = w.history[Math.max(0, w.history.length - 1 - delay)];
  const [x, y] = old;
  const breath = (tick / 60) % c.period < c.period / 2 ? 1 : 0;
  if (kind === 'idle') return emptyLean();
  return {
    x: clamp(target[0] / c.reach + gain * (target[0] - x) + jitter * Math.sin(tick * 0.31)),
    y: clamp(target[1] / c.reach + gain * (target[1] - y) + jitter * Math.cos(tick * 0.23)),
    l: breath,
    r: breath,
    act: false,
  };
}
