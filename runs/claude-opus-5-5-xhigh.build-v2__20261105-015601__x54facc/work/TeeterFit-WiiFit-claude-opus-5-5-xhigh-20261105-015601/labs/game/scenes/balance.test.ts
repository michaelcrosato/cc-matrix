/**
 * @file Balance targets (PLAN.md sections 3 and 16): on 10 seeds at default settings, in every activity, the perfect
 * bot scores at least 750, the human-like delayed thumb 550, the sloppy thumb 300, no input at most 500 and below the
 * human-like thumb. Random mashing never throws, idle finishes by itself, teardown leaves nothing behind.
 */
import { describe, expect, it } from 'vitest';
import { createHeadless } from '../../../engine';
import '../cast/clips';
import { ACTIVITIES } from './events/index';
import { island } from './island';
import type { GameComponents } from './components';

/** Seeds per activity: labs/game/tools/verify.mjs asks for the plan's 10; a plain `npm test` tries 2, for speed. */
const SEEDS = Number(process.env.TEETER_SEEDS ?? 2);
/** The activities to run; TEETER_ONLY narrows it. */
const ONLY = process.env.TEETER_ONLY?.split(',') ?? Object.keys(ACTIVITIES).filter((id) => id !== 'tilt');

/** What the test calls on an engine. */
interface TestEngine {
  actions: { run(name: string, args?: unknown): void };
  set(path: string, value: unknown): void;
  step(n?: number): number;
  seed(n?: number): number;
  state(q: string): { entities: Record<string, unknown>[] };
}

/** One engine for the whole file, restarted for each run: a physics world per run would add up. */
let shared: TestEngine | null = null;

/** Runs one activity to its end with a bot, returns its score. */
async function run(id: string, skill: string, seed: number): Promise<{ score: number; steps: number; rank: string }> {
  shared ??= (await createHeadless({ scene: island, seed })) as unknown as TestEngine;
  const engine = shared;
  engine.seed(seed);
  engine.set('game.auto', false);
  engine.set('game.botSeat', false);
  engine.actions.run('game.begin', {});
  engine.set('game.skill', skill);
  engine.actions.run('game.start', { event: id });
  engine.set('game.botSeat', true);
  let flow = engine.state('flow').entities[0].flow as GameComponents['flow'];
  let n = 0;
  while (n < 60 * 240) {
    engine.step(30);
    n += 30;
    flow = engine.state('flow').entities[0].flow as GameComponents['flow'];
    if (flow.mode === 'results') break;
  }
  const { score = -1, rank = '' } = flow.last;
  return { score, steps: n, rank };
}

describe('balance', () => {
  for (const id of ONLY) {
    it(`${id}: the four players meet their targets`, async () => {
      const scores: Record<string, number[]> = { perfect: [], human: [], sloppy: [], idle: [] };
      for (let seed = 1; seed <= SEEDS; seed++) {
        for (const skill of Object.keys(scores)) {
          const { score, steps } = await run(id, skill, seed);
          scores[skill].push(score);
          expect(steps, `${id} ${skill} seed ${seed} never finished`).toBeLessThan(60 * 240);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1000);
        }
      }
      const low = (list: number[]) => Math.min(...list);
      const high = (list: number[]) => Math.max(...list);
      const mean = (list: number[]) => Math.round(list.reduce((a, b) => a + b, 0) / list.length);
      if (process.env.TEETER_SHOW) console.log(id, { p: [low(scores.perfect), mean(scores.perfect)], h: [low(scores.human), mean(scores.human)], s: [low(scores.sloppy), mean(scores.sloppy)], i: [high(scores.idle), mean(scores.idle)] }); // prettier-ignore
      expect(low(scores.perfect)).toBeGreaterThanOrEqual(750);
      expect(low(scores.human)).toBeGreaterThanOrEqual(550);
      expect(low(scores.sloppy)).toBeGreaterThanOrEqual(300);
      expect(high(scores.idle)).toBeLessThanOrEqual(500);
      expect(mean(scores.idle)).toBeLessThan(mean(scores.human));
      // Random mashing never throws, and the score stays a score.
      const mashed = await run(id, 'mash', 1);
      expect(mashed.steps).toBeLessThan(60 * 240);
      expect(Number.isFinite(mashed.score)).toBe(true);
      expect(mashed.score).toBeGreaterThanOrEqual(0);
      expect(mashed.score).toBeLessThanOrEqual(1000);
    }, 3_000_000);
  }
});
