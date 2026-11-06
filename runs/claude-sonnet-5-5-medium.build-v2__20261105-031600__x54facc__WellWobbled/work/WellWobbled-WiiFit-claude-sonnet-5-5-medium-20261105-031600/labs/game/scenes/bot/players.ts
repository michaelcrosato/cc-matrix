/**
 * @file The four stand-in players every test and the attract mode use: perfect (no delay), human-like (reads the centre
 * of balance 250 ms late, gain 1.2, jitter), sloppy (350 ms, gain 0.8) and idle. They write the same seat input a pad
 * does. Delay is a history buffer in the bot's own state; jitter comes from a tiny LCG (no Math.random). Also `mash`,
 * random button mashing for crash tests. Sim-side.
 * @example
 * const bot = newBot('human', 7); botSeat(bot, wobble, seat, 0, 0, 1); // writes seat.lx, seat.ly, seat.fl, seat.fr
 */
import type { Seat, Wobble } from '../wobble';

export type BotKind = 'perfect' | 'human' | 'sloppy' | 'idle' | 'mash';
export interface Bot {
  kind: BotKind;
  delay: number;
  gain: number;
  jitter: number;
  hx: number[];
  hy: number[];
  s: number;
  nb: number;
}
const PRESET: Record<BotKind, [number, number, number]> = { perfect: [0, 3, 0], human: [15, 1.2, 0.04], sloppy: [21, 0.8, 0.06], idle: [0, 0, 0], mash: [0, 0, 0] }; // prettier-ignore

/** A bot of `kind`, jitter seeded by `seed`. */
export function newBot(kind: BotKind, seed: number): Bot {
  const [delay, gain, jitter] = PRESET[kind];
  return { kind, delay, gain, jitter, hx: [], hy: [], s: (seed * 2654435761 + 12345) >>> 0, nb: 0 };
}
/** Next uniform number in -1..1 from the bot's LCG. */
export function noise(b: Bot): number {
  b.s = (Math.imul(b.s, 1664525) + 1013904223) >>> 0;
  return (b.s / 4294967296) * 2 - 1;
}
/** The CoB the bot sees: `delay` steps ago. */
export function seen(b: Bot, w: Wobble): [number, number] {
  b.hx.push(w.x);
  b.hy.push(w.y);
  if (b.hx.length > b.delay + 1) {
    b.hx.shift();
    b.hy.shift();
  }
  return [b.hx[0], b.hy[0]];
}
/**
 * Writes lean for holding the CoB at (px, py); `breath` 1 holds both feet to the guide, 0 releases them, `foot` forces
 * one or both feet held (1 left, 2 right, 3 both) when nonzero. Returns nothing.
 */
export function botSeat(b: Bot, w: Wobble, s: Seat, px: number, py: number, breath = 0, foot = 0): void {
  if (b.kind === 'idle') {
    s.lx = 0;
    s.ly = 0;
    s.fl = 0;
    s.fr = 0;
    return;
  }
  if (b.kind === 'mash') {
    b.nb += 1;
    if (b.nb % 7 === 0) {
      s.lx = noise(b);
      s.ly = noise(b);
      s.fl = noise(b) > 0 ? 1 : 0;
      s.fr = noise(b) > 0 ? 1 : 0;
      s.act = noise(b) > 0.5;
      s.gentle = noise(b) > 0.5;
      s.mx = noise(b) * 0.2;
      s.my = 0;
    }
    return;
  }
  const [xd, yd] = seen(b, w);
  const sx = (px + b.gain * (px - xd)) / 0.9 + noise(b) * b.jitter * 4;
  const sy = (py + b.gain * (py - yd)) / 0.9 + noise(b) * b.jitter * 4;
  s.lx = Math.max(-1, Math.min(1, sx));
  s.ly = Math.max(-1, Math.min(1, sy));
  const hold = breath ? (w.lungs < w.guide ? 1 : 0) : 0;
  s.fl = foot & 1 || hold ? 1 : 0;
  s.fr = foot & 2 || hold ? 1 : 0;
  if (b.kind !== 'perfect' && breath && b.delay > 0 && w.lungs > w.guide + 0.04) {
    s.fl = 0;
    s.fr = 0;
  }
}
