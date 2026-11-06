/**
 * @file A session's round in Node: three classes dealt by seed, ghosts on neighbouring mats, a leaver who walks off, a result.
 */
import { describe, expect, it } from 'vitest';
import { createHeadless, type Headless } from '../../../engine';
import '../props';
import '../cast/clips';
import { round } from './round';
import type { Flow } from './types';

type Runner = Headless & { actions: { run(name: string, args?: unknown): void } };
const flowOf = (e: Headless) => (e.state('flow').entities[0] as unknown as { flow: Flow }).flow;

describe('game:round', () => {
  it('runs three classes with a ghost, and ends with results', async () => {
    const engine = (await createHeadless({ scene: round, seed: 9 })) as Runner;
    engine.actions.run('round.seat', { me: 1, players: [0, 1, 2] });
    engine.step(5);
    expect(engine.state('ghost').entities.length).toBe(2);
    const seat = (engine.state('seat').entities as unknown as { seat: { actor: number } }[])[1];
    expect(Math.abs((engine.get(seat.seat.actor) as unknown as { actor: { y: number } }).actor.y)).toBeLessThan(0.1);
    engine.actions.run('game.bot', { skill: 'perfect' });
    engine.actions.run('round.go');
    let steps = 0;
    while (flowOf(engine).mode !== 'results' && steps < 60 * 300) {
      engine.step(30, { 'game:ghosts': [0, flowOf(engine).group?.at ?? 0, 0.1, -0.1, 300, 1] } as never);
      steps += 30;
      if (steps === 600) engine.actions.run('round.leave', { seat: 2 });
    }
    const flow = flowOf(engine);
    expect(flow.mode).toBe('results');
    expect(flow.group?.list.length).toBe(3);
    expect(flow.group?.scores[1]).toBeGreaterThan(1800);
    expect(steps / 60).toBeLessThan(200);
  }, 120000);
});
