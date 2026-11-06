/**
 * @file `game:main` steps an operation from `game:hands`, and a capture continues as the same body.
 */
import { describe, expect, it } from 'vitest';
import { createHeadless } from '../../../engine';
import { packHands } from '../op/codec';
import { idleHand } from '../op/world';
import { followChart, liveOp } from './bridge';
import { main, type Chart } from './main';

/** The chart is what capture stores. The cursors are read from it, so a restore is in effect before the next hands. */
function sync(engine: { state: () => { entities: readonly object[] } }): void {
  const entities = engine.state().entities as { chart?: Chart }[];
  const blob = entities.find((entity) => entity.chart)?.chart?.blob;
  if (blob) followChart(blob);
}

describe('game:main', () => {
  it('steps a case from packed hands and restores it', async () => {
    const engine = await createHeadless({
      scene: main,
      seed: 1,
      settings: { 'game.run': 'op:first-cut', 'game.seed': 1 },
    });
    const hand = () => {
      sync(engine);
      const op = liveOp();
      if (!op) return [];
      const hands = op.seats.map((seat) => ({ ...idleHand(seat), x: seat.x + 0.01, z: seat.z }));
      return packHands(hands);
    };
    for (let i = 0; i < 30; i++) engine.step(1, { 'game:hands': hand() });
    const mid = liveOp();
    expect(mid?.tick).toBe(30);
    expect(mid?.status).toBe('playing');
    const capture = engine.capture();
    for (let i = 0; i < 20; i++) engine.step(1, { 'game:hands': hand() });
    const ahead = engine.hash();
    engine.restore(capture);
    sync(engine);
    expect(liveOp()?.tick).toBe(30);
    for (let i = 0; i < 20; i++) engine.step(1, { 'game:hands': hand() });
    expect(engine.hash()).toBe(ahead);
    const chart = engine.state().entities.find((entity) => entity.chart) as { chart?: Chart } | undefined;
    expect(chart?.chart?.status).toBe('playing');
  });
});
