/** @file Deterministic fixed-step balance and activity simulation. */

import type { Activity } from './programme';

export type BalanceSettings = { gain: number; instability: number; damping: number; noise: number; noiseRate: number; reach: number; breathSeconds: number; calmEffect: number };
export const DEFAULT_BALANCE: BalanceSettings = { gain: 14, instability: 3, damping: 5, noise: 0.15, noiseRate: 0.15, reach: 0.9, breathSeconds: 8, calmEffect: 0.5 };
export type Input = { x: number; y: number; gentle: boolean };
export type Foot = 'left' | 'right' | 'both';
export type Balance = { x: number; y: number; vx: number; vy: number; targetX: number; targetY: number; time: number; calm: number; outside: number; recovering: number; falls: number };
export type Session = { activity: Activity; balance: Balance; time: number; scoreSum: number; samples: number; hits: number; attempts: number; foot: Foot | null; lastFoot: Foot | null; cue: Foot; actionFlash: number; seed: number; finished: boolean; score: number };

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const approach = (value: number, target: number, amount: number) => value + clamp(target - value, -amount, amount);

export function createBalance(): Balance {
  return { x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0, time: 0, calm: 0, outside: 0, recovering: 0, falls: 0 };
}

export function createSession(activity: Activity, seed = 1): Session {
  return { activity, balance: createBalance(), time: 0, scoreSum: 0, samples: 0, hits: 0, attempts: 0, foot: null, lastFoot: null, cue: 'left', actionFlash: 0, seed, finished: false, score: 0 };
}

export function stepBalance(balance: Balance, input: Input, settings: BalanceSettings, dt: number, seed = 1): void {
  balance.time += dt;
  const length = Math.hypot(input.x, input.y);
  const scale = (length > 1 ? 1 / length : 1) * settings.reach * (input.gentle ? 0.4 : 1);
  balance.targetX = approach(balance.targetX, input.x * scale, 4 * dt);
  balance.targetY = approach(balance.targetY, input.y * scale, 4 * dt);
  const quiet = Math.hypot(balance.vx, balance.vy) < 0.17 && length < 0.2;
  balance.calm = clamp(balance.calm + (quiet ? dt * 0.15 : -dt * 0.3), 0, 1);
  if (balance.recovering > 0) {
    balance.recovering -= dt;
    balance.x *= Math.exp(-5 * dt); balance.y *= Math.exp(-5 * dt);
    balance.vx = 0; balance.vy = 0;
    return;
  }
  const noise = settings.noise * (1 - settings.calmEffect * balance.calm);
  const phase = balance.time * settings.noiseRate * Math.PI * 2;
  const nx = Math.sin(phase + seed * 1.71) * 0.65 + Math.sin(phase * 1.73 + seed) * 0.35;
  const ny = Math.sin(phase * 0.83 + seed * 2.13) * 0.65 + Math.sin(phase * 1.47 + seed * 0.8) * 0.35;
  balance.vx += (settings.gain * (balance.targetX - balance.x) + settings.instability * balance.x + noise * nx) * dt;
  balance.vy += (settings.gain * (balance.targetY - balance.y) + settings.instability * balance.y + noise * ny) * dt;
  balance.vx *= Math.exp(-settings.damping * dt); balance.vy *= Math.exp(-settings.damping * dt);
  balance.x += balance.vx * dt; balance.y += balance.vy * dt;
  balance.outside = Math.hypot(balance.x, balance.y) > 1 ? balance.outside + 1 : 0;
  if (balance.outside >= 6) { balance.falls++; balance.outside = 0; balance.recovering = 1; }
}

export function targetFor(session: Session): { x: number; y: number; label: string } {
  const time = session.time;
  const kind = session.activity.kind;
  if (kind === 'pond') return { x: 0, y: 0, label: 'Breathe in. Breathe out.' };
  if (kind === 'line' || kind === 'reps' || kind === 'step' || kind === 'group' || kind === 'jog') return { x: Math.sin(time * 0.28) * (kind === 'line' ? 0.12 : 0.2), y: 0, label: 'Find your centre' };
  if (kind === 'hoop') return { x: Math.sin(time * 1.35) * 0.44, y: Math.cos(time * 1.35) * 0.44, label: 'Follow the hoop' };
  if (kind === 'paddle') return { x: Math.sin(time * 0.38) * 0.56, y: 0.12, label: 'Steer through the buoys' };
  if (kind === 'sand') { const index = Math.floor(time / 12); return { x: [0.48, -0.48, 0.18, -0.32, 0][index % 5], y: [-0.25, 0.25, 0.48, -0.42, 0][index % 5], label: `Garden ${Math.min(5, index + 1)} of 5` }; }
  if (kind === 'finale') { const index = Math.floor(time / 18); return { x: Math.sin(time * 0.35) * 0.48, y: Math.cos(time * 0.21) * 0.32, label: ['Steady the crowd', 'Hold the island', 'Help the carts', 'Find the fulcrum', 'Wait for the sunrise'][Math.min(index, 4)] }; }
  if (kind === 'pose') { const index = Math.floor(time / 15); return { x: [0, 0.35, -0.35][index % 3], y: [0, -0.28, 0.22][index % 3], label: ['Find your centre', 'Hold the shape', 'A little longer'][index % 3] }; }
  if (kind === 'cliff') return { x: Math.sin(time * 0.28) * 0.35, y: -0.3, label: 'Find your diving line' };
  const index = Math.floor(time / 6);
  return { x: [0, -0.38, 0.38, 0, 0][index % 5], y: [0, 0, 0, -0.38, 0.38][index % 5], label: ['Find your centre', 'Lean left', 'Lean right', 'Lean forward', 'Lean back'][index % 5] };
}

export function action(session: Session, foot: Foot): boolean {
  if (session.finished) return false;
  session.foot = foot; session.attempts++; session.actionFlash = 0.5;
  const kind = session.activity.kind;
  const beat = Math.abs((session.time % 1.2) - 0.6) < 0.3;
  const matched = kind === 'reps' || kind === 'cliff' ? foot === 'both' : foot !== 'both' && foot !== session.lastFoot;
  const good = matched && (kind === 'step' || kind === 'reps' ? beat : true);
  if (good) session.hits++;
  if (foot !== 'both') session.lastFoot = foot;
  session.cue = session.cue === 'left' ? 'right' : 'left';
  return good;
}

export function stepSession(session: Session, input: Input, settings: BalanceSettings, dt = 1 / 60): void {
  if (session.finished) return;
  session.time += dt;
  stepBalance(session.balance, input, settings, dt, session.seed);
  session.actionFlash = Math.max(0, session.actionFlash - dt);
  const target = targetFor(session);
  const distance = Math.hypot(session.balance.x - target.x, session.balance.y - target.y);
  const calmBonus = session.activity.kind === 'pond' ? session.balance.calm * 0.15 : 0;
  session.scoreSum += clamp(1 - distance * 0.8 + calmBonus, 0, 1);
  session.samples++;
  if (session.time >= session.activity.duration) {
    const movement = session.scoreSum / Math.max(1, session.samples);
    const actionKind = ['reps', 'step', 'line', 'paddle', 'cliff', 'jog', 'group'].includes(session.activity.kind);
    const expected = session.activity.duration / 2.5;
    const actionScore = clamp(session.hits / expected, 0, 1);
    session.score = Math.round(clamp((actionKind ? movement * 0.7 + actionScore * 0.3 : movement) - session.balance.falls * 0.025, 0, 1) * 1000);
    session.finished = true;
  }
}
