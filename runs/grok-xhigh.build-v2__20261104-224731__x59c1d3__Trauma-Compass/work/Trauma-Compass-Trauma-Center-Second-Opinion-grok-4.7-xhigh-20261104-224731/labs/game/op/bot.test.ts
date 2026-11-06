/**
 * @file The shipped bot, from each case's own start. It may only steer through hands. A win is `status === 'won'`.
 */
import { describe, expect, it } from 'vitest';
import { runBot } from './bot';
import { caseById, storyCases } from './cases';
import type { Difficulty } from './types';
import { createFromCase, debugOp } from './world';

/** One required run: case, difficulty, seed, and how many seats. */
function runs(): [string, Difficulty, number, number][] {
  const out: [string, Difficulty, number, number][] = [];
  for (const item of storyCases()) {
    for (const seed of [1, 2, 3]) out.push([item.id, 'resident', seed, 1]);
  }
  for (const difficulty of ['intern', 'attending'] as const) {
    out.push(['case:first-cut', difficulty, 1, 1], ['case:mercy', difficulty, 1, 1]);
  }
  out.push(['case:first-cut', 'resident', 1, 2], ['case:first-cut', 'resident', 1, 4]);
  out.push(['case:gala-shift', 'resident', 1, 1]);
  return out;
}

describe('operation bot', () => {
  it.each(runs())('%s %s seed %s seats %s', (id, difficulty, seed, seats) => {
    const op = createFromCase(id, { seed, difficulty, seats });
    runBot(op);
    expect(op.status, debugOp(op)).toBe('won');
    const par = caseById(id).par;
    if (difficulty === 'resident' && seed === 1 && seats === 1) {
      expect(Math.abs(op.score - par) / par).toBeLessThan(0.05);
    }
  });
});
