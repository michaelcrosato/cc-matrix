/**
 * @file The balance tests (PLAN.md sections 3 and 16): the four players on every activity, on 10 seeds, must meet the plan's
 * targets; random mashing never throws; idle finishes by itself; scores stay in range; teardown leaves nothing behind.
 * `npm test` plays 2 seeds; `tools/verify.mjs` sets WT_SEEDS=10, in smaller groups, since a few hundred headless islands in one
 * worker is more memory than a shared machine has. The mean scores go to out/balance.json for tuning.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createHeadless } from '../../../engine';
import '../props';
import '../cast/clips';
import { PLAYED } from './events';
import { island } from './island';

const SEEDS = Number(process.env.WT_SEEDS ?? 2);
const PLAYERS = ['perfect', 'human', 'sloppy', 'idle'] as const;
const LIMIT = 60 * 240;

type Flowish = { mode: string; last: { score: number }; ev: { id: string; phase: string } | null; pebbles: number };

/** Plays one activity with one bot, returns the score. */
export async function playOnce(
  id: string,
  skill: string,
  seed: number,
): Promise<{ score: number; steps: number; left: number; before: number }> {
  const engine = await createHeadless({ scene: island, seed });
  const act = (engine as unknown as { actions: { run(name: string, args?: unknown): void } }).actions;
  act.run('game.begin', {});
  const flowOf = () => (engine.state('flow').entities[0] as unknown as { flow: Flowish }).flow;
  const before = engine.entities().length;
  act.run('game.bot', { skill });
  const short = ['ring', 'heron', 'hoopS', 'stepS', 'pondS'].includes(id);
  act.run('game.start', { id, ...(short ? {} : {}) });
  let steps = 0;
  while (flowOf().mode === 'event' && steps < LIMIT) {
    engine.step(30);
    steps += 30;
  }
  const flow = flowOf();
  return { score: flow.mode === 'results' ? flow.last.score : -1, steps, left: engine.entities().length, before };
}

describe('every activity, four players', () => {
  it('meets the targets on every seed', async () => {
    const table: Record<string, Record<string, number>> = {};
    const problems: string[] = [];
    const only = process.env.WT_ONLY?.split(',');
    for (const id of PLAYED) {
      if (only && !only.includes(id)) continue;
      table[id] = {};
      for (const skill of PLAYERS) {
        let sum = 0;
        let time = 0;
        for (let seed = 1; seed <= SEEDS; seed++) {
          const { score, left, before, steps } = await playOnce(id, skill, seed);
          time += steps;
          if (score < 0) problems.push(`${id} ${skill} seed ${seed}: never finished`);
          if (left !== before) problems.push(`${id} ${skill} seed ${seed}: left ${left - before} entities`);
          if (!(score >= 0 && score <= 1000)) problems.push(`${id} ${skill} seed ${seed}: score ${score}`);
          sum += score;
        }
        table[id][skill] = Math.round(sum / SEEDS);
        table[id][`${skill}S`] = Math.round(time / SEEDS / 60);
      }
      const row = table[id];
      if (row.perfect < 750) problems.push(`${id}: perfect ${row.perfect} < 750`);
      if (row.human < 550) problems.push(`${id}: human ${row.human} < 550`);
      if (row.sloppy < 300) problems.push(`${id}: sloppy ${row.sloppy} < 300`);
      if (row.idle > 500) problems.push(`${id}: idle ${row.idle} > 500`);
      if (row.idle >= row.human) problems.push(`${id}: idle ${row.idle} >= human ${row.human}`);
    }
    mkdirSync('out', { recursive: true });
    writeFileSync(process.env.WT_OUT ?? 'out/balance.json', JSON.stringify({ table, problems }, null, 1));
    expect(problems).toEqual([]);
  }, 1200000);

  it('random mashing never throws', async () => {
    for (const id of PLAYED) {
      const { score } = await playOnce(id, 'random', 3);
      expect(score).toBeGreaterThanOrEqual(0);
    }
  }, 600000);
});
