/**
 * @file Test helpers for the sim: a lite island world (flat ground, bare guest), start an activity, play it with a bot
 * until the result, read components. Used by every activity test and the whole-game playthrough. Sim-side (no DOM).
 * @example
 * const r = await playActivity('morning', 'perfect', 1); r.score; // 0-1000
 */
import { createHeadless } from '../../../engine';
import '../scenes/island';

type H = Awaited<ReturnType<typeof createHeadless>>;
export interface Played {
  score: number;
  rank: string;
  steps: number;
  done: boolean;
  h: H;
  events: Record<string, number>;
}
export const comp = <T = Record<string, unknown>>(h: H, name: string): T[] =>
  (h.state(name).entities as unknown as Record<string, unknown>[]).map((e) => e[name] as T);
export async function lite(seed: number, settings: Record<string, unknown> = {}): Promise<H> {
  return createHeadless({ scene: 'game:island', seed, settings: { 'game.lite': true, ...settings } });
}
/** Plays `id` with bot `kind` (or '' for no input at all) to its results; gives up after `max` steps. */
export async function playActivity(
  id: string,
  kind: string,
  seed: number,
  opts: { short?: boolean; max?: number; settings?: Record<string, unknown>; random?: boolean } = {},
): Promise<Played> {
  const h = await lite(seed, opts.settings);
  const run = h.actions as unknown as { run(n: string, a?: object): void };
  run.run('game.start', { event: id, short: !!opts.short });
  if (kind) run.run('game.bot', { kind });
  const max = opts.max ?? 60 * 300;
  let steps = 0;
  let mode = 'event';
  while (steps < max) {
    h.step(30);
    steps += 30;
    mode = comp<{ mode: string }>(h, 'flow')[0].mode;
    if (mode !== 'event') break;
  }
  const f = comp<{ score: number; rank: string }>(h, 'flow')[0];
  return { score: f.score, rank: f.rank, steps, done: mode !== 'event', h, events: {} };
}
