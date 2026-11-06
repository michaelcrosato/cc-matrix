/** @file A whole Group Class round: guest + three CPU guests play three short classes; same seed gives the same deal and totals. */
import { describe, expect, it } from 'vitest';
import { comp, lite } from '../../tools/testkit';

async function playRound(seed: number): Promise<{ total: number[]; deal: number; steps: number }> {
  const h = await lite(seed);
  const run = h.actions as unknown as { run(n: string, a?: object): void };
  run.run('game.round', { players: 1, cpu: true });
  run.run('game.bot', { kind: 'human' });
  let steps = 0;
  while (steps < 60 * 400) {
    h.step(60);
    steps += 60;
    if (comp<{ mode: string }>(h, 'flow')[0].mode !== 'event') break;
  }
  const r = comp<{ total: number[]; deal: number; on: number }>(h, 'round')[0];
  expect(comp<{ mode: string }>(h, 'flow')[0].mode).toBe('results');
  expect(r.on).toBe(0);
  return { total: r.total, deal: r.deal, steps };
}
describe('round', () => {
  it('plays three classes to a podium, deterministically', async () => {
    const a = await playRound(5);
    const b = await playRound(5);
    expect(a).toEqual(b);
    expect(a.total[0]).toBeGreaterThan(300);
    expect(a.total[1]).toBeGreaterThan(300);
    expect(a.total[3]).toBeGreaterThan(300);
    expect(a.total.every((t) => Number.isFinite(t))).toBe(true);
  }, 600000);
});
