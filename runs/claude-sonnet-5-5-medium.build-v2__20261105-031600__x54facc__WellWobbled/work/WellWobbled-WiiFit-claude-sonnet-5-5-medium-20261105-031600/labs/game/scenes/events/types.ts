/**
 * @file The shape every activity module shares, the context it runs in, and small helpers (phase clock, rank, say).
 * An activity runs per seat: `Ctx.me` is the seat's body (guest, a CPU guest, any class seat) and `Ctx.run` that seat's
 * own `act` component, so the same module plays the island, Group Class and a hub Round. Sim-side.
 * @example
 * rankOf(760).word; // 'Serene'
 */
import type { Entity, World } from '../../../../engine/sim-api';
import type { ActorComponent } from '../../../../engine/sim-api';
import type { ActData, CastData, Comps, FlowData } from '../components';
import type { Bot } from '../bot/players';
import type { Seat, Wobble } from '../wobble';

export type W = World<Comps>;
export type Seated = Entity<Comps> & {
  seat: Seat;
  wobble: Wobble;
  act: ActData;
  cast: CastData;
  actor: ActorComponent;
};
/** What an activity step sees. */
export interface Ctx {
  w: W;
  run: ActData;
  flow: FlowData;
  me: Seated;
  mine: number;
  origin: readonly [number, number, number];
  yaw: number;
  p: (path: string) => number; // a tunable
  lead: boolean; // the seat belongs to the person at the screen (it speaks, it moves the camera)
}
/** What the runner tells the page about an activity. */
export interface Activity {
  id: string;
  title: string;
  station: string;
  camera: string;
  map: string;
  seconds: number;
  hasShort: boolean;
  setup(c: Ctx): void;
  step(c: Ctx): void;
  bot(c: Ctx, b: Bot): void;
  teardown?(c: Ctx): void;
}
export const RANKS = [
  { min: 900, word: 'Unsettling', pebbles: 5 },
  { min: 750, word: 'Serene', pebbles: 4 },
  { min: 550, word: 'Composed', pebbles: 3 },
  { min: 300, word: 'Adequate', pebbles: 2 },
  { min: 0, word: 'Present', pebbles: 1 },
] as const;
export function rankOf(score: number): { word: string; pebbles: number } {
  return RANKS.find((r) => score >= r.min) ?? RANKS[RANKS.length - 1];
}
/** Moves to phase `name`, resetting the phase clock `a[0]`. */
export function go(run: ActData, name: string): void {
  run.phase = name;
  run.a[0] = 0;
}
/** Say a line id: the page turns ids into text and voice. Only the lead seat speaks. */
export function say(c: Ctx | W, who: string, id: string): void {
  const w = 'w' in c ? c.w : c;
  if ('w' in c && !c.lead) return;
  w.emit('say', { who, id });
}
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
export const secs = (n: number): number => Math.round(n * 60);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
