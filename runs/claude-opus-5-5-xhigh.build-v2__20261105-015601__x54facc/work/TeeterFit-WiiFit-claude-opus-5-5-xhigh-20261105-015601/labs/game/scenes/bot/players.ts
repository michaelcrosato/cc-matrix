/**
 * @file The four players that stand in for a human (PLAN.md section 16), plus a masher. They write the same seat input
 * a person does. `perfect` has no delay; `human` reads the CoB 250 ms late at gain 1.2 with a little jitter; `sloppy`
 * reads 350 ms late at gain 0.8; `idle` does nothing; `mash` presses at random, to prove nothing throws. In rhythm and
 * timing activities the delay and jitter become timing error (`timing`, in steps).
 *
 * Game code, sim-side.
 *
 * @example
 * // holdAt(w, seat, wobble, 0, 0, playerOf('human')); // steer towards the centre
 */
import type { GameWorld, Seat, Wobble } from '../components';

/** One of the players' numbers. */
export interface Player {
  name: string;
  /** Steps it reads the CoB late. */
  delay: number;
  /** Proportional gain on what it reads. */
  gain: number;
  /** Stick jitter. */
  jitter: number;
  /** Timing error in rhythm, steps either side. */
  timing: number;
  /** Whether it takes any action at all. */
  acts: boolean;
}

/** The players (see the file comment). */
export const PLAYERS: Readonly<Record<string, Player>> = Object.freeze({
  perfect: { name: 'perfect', delay: 0, gain: 3, jitter: 0, timing: 0, acts: true },
  human: { name: 'human', delay: 15, gain: 1.2, jitter: 0.04, timing: 4, acts: true },
  sloppy: { name: 'sloppy', delay: 21, gain: 0.8, jitter: 0.06, timing: 8, acts: true },
  idle: { name: 'idle', delay: 0, gain: 0, jitter: 0, timing: 0, acts: false },
  mash: { name: 'mash', delay: 0, gain: 0, jitter: 1, timing: 0, acts: true },
});

/** The player called `name`, or the perfect one. */
export const playerOf = (name: string): Player => PLAYERS[name] ?? PLAYERS.perfect;

/** How much lean holds a body still at a place: the model's balance of gain, instability and reach, at defaults. */
const FEED_FORWARD = 0.87;

/** The CoB as the player read it `delay` steps ago; pushes the current one into its memory. */
export function remembered(seat: Seat, wob: Wobble, delay: number): [number, number] {
  const hist = seat.hist;
  hist.push(wob.x, wob.y);
  const keep = 2 * (delay + 2);
  if (hist.length > keep) hist.splice(0, hist.length - keep);
  const at = Math.max(0, hist.length - 2 - 2 * delay);
  return [hist[at], hist[at + 1]];
}

/** Writes the lean that steers this body towards `gx, gy`, as `player` would. */
export function holdAt(w: GameWorld, seat: Seat, wob: Wobble, gx: number, gy: number, player: Player): void {
  if (!player.acts) {
    seat.lx = seat.ly = 0;
    return;
  }
  const [cx, cy] = remembered(seat, wob, player.delay);
  const jitter = player.jitter;
  const rng = w.rng('botJitter', seat.index);
  const jx = jitter > 0 ? rng.range(-jitter, jitter) : 0;
  const jy = jitter > 0 ? rng.range(-jitter, jitter) : 0;
  seat.lx = gx * FEED_FORWARD + (gx - cx) * player.gain + jx;
  seat.ly = gy * FEED_FORWARD + (gy - cy) * player.gain + jy;
}

/** Writes the breath: holds both feet while the guide fills, lets go while it empties, `lag` steps late. */
export function breathe(w: GameWorld, seat: Seat, wob: Wobble, player: Player): void {
  if (!player.acts) {
    seat.fl = seat.fr = 0;
    return;
  }
  const period = Math.max(1, Math.round(w.settings.get<number>('game.breath.period') * w.hz));
  const lag = player.delay;
  const phase = ((wob.bt - lag + period * 4) % period) / period;
  const down = phase < 0.5 ? 1 : 0;
  seat.fl = seat.fr = down;
}

/** A timing error for one press, in steps, as this player has it; 0 for the perfect one. */
export function timingError(w: GameWorld, seat: Seat, player: Player): number {
  if (player.timing <= 0) return 0;
  return Math.round(w.rng('botTiming', seat.index).range(-player.timing, player.timing));
}

/** Random input for a step: the masher. */
export function mash(w: GameWorld, seat: Seat): void {
  const rng = w.rng('botMash', seat.index);
  if (rng.chance(0.2)) seat.lx = rng.range(-1, 1);
  if (rng.chance(0.2)) seat.ly = rng.range(-1, 1);
  if (rng.chance(0.2)) seat.fl = rng.chance(0.5) ? 1 : 0;
  if (rng.chance(0.2)) seat.fr = rng.chance(0.5) ? 1 : 0;
  seat.act = rng.chance(0.1);
}
