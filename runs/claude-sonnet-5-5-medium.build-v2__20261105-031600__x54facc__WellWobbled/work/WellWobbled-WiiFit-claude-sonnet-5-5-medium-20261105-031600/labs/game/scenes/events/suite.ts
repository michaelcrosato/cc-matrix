/**
 * @file The shared activity test: the four players on `seeds` seeds against the balance targets (perfect >= 750,
 * human-like >= 550, sloppy >= 300, idle <= 500 and below human-like), random mashing never throws, scores stay in
 * range with no NaN, and idle finishes on its own. Used by each activity's test file.
 * @example
 * await balanceReport('morning', 3); // { perfect, human, sloppy, idle } means
 */
import { expect } from 'vitest';
import { comp, playActivity } from '../../tools/testkit';

export async function balanceReport(id: string, seeds: number, short = false): Promise<Record<string, number>> {
  const mean: Record<string, number> = {};
  for (const kind of ['perfect', 'human', 'sloppy', 'idle']) {
    let sum = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      const r = await playActivity(id, kind === 'idle' ? 'idle' : kind, seed, { short });
      expect(r.done, `${id} ${kind} seed ${seed} finishes`).toBe(true);
      expect(Number.isFinite(r.score) && r.score >= 0 && r.score <= 1000).toBe(true);
      sum += r.score;
    }
    mean[kind] = sum / seeds;
  }
  return mean;
}
export function expectTargets(id: string, m: Record<string, number>, strict = true): void {
  console.log(
    'BAL',
    id,
    JSON.stringify(m, (_k, v) => (typeof v === 'number' ? Math.round(v) : v)),
  );
  if (!strict) return;
  expect(m.perfect, `${id} perfect`).toBeGreaterThanOrEqual(750);
  expect(m.human, `${id} human`).toBeGreaterThanOrEqual(550);
  expect(m.sloppy, `${id} sloppy`).toBeGreaterThanOrEqual(300);
  expect(m.idle, `${id} idle`).toBeLessThanOrEqual(500);
  expect(m.idle, `${id} idle < human`).toBeLessThan(m.human);
}
export async function mashSafe(id: string, seed = 3): Promise<void> {
  const r = await playActivity(id, 'mash', seed);
  expect(r.done).toBe(true);
  expect(Number.isFinite(r.score)).toBe(true);
  const ids = comp<{ ids: number[] }>(r.h, 'act');
  expect(ids.length).toBeGreaterThan(0);
}
