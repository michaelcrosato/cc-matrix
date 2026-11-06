/** @file The whole game, scripted: every day's activities in the Programme, Group Class with CPU guests and the Great Tilt's five steps all finish by themselves for a bot, on 3 seeds; teardown leaves no stray entities. This is the softlock finder. */
import { describe, expect, it } from 'vitest';
import { DAYS } from './data/days';
import { comp, lite } from '../tools/testkit';

const run = (h: Awaited<ReturnType<typeof lite>>) => h.actions as unknown as { run(n: string, a?: object): void };
describe('whole game', () => {
  for (const seed of [1, 2, 3]) {
    it(`plays every day on seed ${seed}`, async () => {
      const h = await lite(seed);
      const before = (h.state('mark').entities as unknown[]).length;
      for (const day of DAYS) {
        run(h).run('game.day', { day: day.n });
        for (const id of day.acts.filter((a) => a !== 'board')) {
          if (id === 'group') run(h).run('game.round', { players: 1, cpu: true });
          else run(h).run('game.start', { event: id });
          run(h).run('game.bot', { kind: seed === 1 ? 'perfect' : 'human' });
          let steps = 0;
          while (steps < 60 * 400) {
            h.step(60);
            steps += 60;
            if (comp<{ mode: string }>(h, 'flow')[0].mode !== 'event') break;
          }
          const f = comp<{ mode: string; score: number }>(h, 'flow')[0];
          expect(f.mode, `day ${day.n} ${id} ends`).toBe('results');
          expect(Number.isFinite(f.score)).toBe(true);
          run(h).run('game.leave');
        }
      }
      expect((h.state('mark').entities as unknown[]).length).toBe(before);
      expect(comp<{ mode: string }>(h, 'flow')[0].mode).toBe('roam');
    }, 1800000);
  }
});
