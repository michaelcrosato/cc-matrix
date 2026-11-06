/** @file Specific rules: the Wobble Age formula's bounds and yesterday comparison, Still Pond's capped idle result and fake-prompt cost, Step Class windows and combos. */
import { describe, expect, it } from 'vitest';
import { playActivity } from '../../tools/testkit';
import { ageOf } from './morning';
import { parseChart, PHRASES } from '../data/charts';

describe('rules', () => {
  it('Wobble Age stays 18..82 and falls as steadiness rises', () => {
    for (let s = 0; s <= 1; s += 0.1) {
      const a = ageOf(s, 1.3);
      expect(a).toBeGreaterThanOrEqual(18);
      expect(a).toBeLessThanOrEqual(82);
    }
    expect(ageOf(0.8, 1.3)).toBeLessThan(ageOf(0.4, 1.3));
  });
  it('Still Pond: doing nothing earns exactly 500; mashing costs composure; breathing lifts the score', async () => {
    const idle = await playActivity('pond', 'idle', 4);
    const mash = await playActivity('pond', 'mash', 4);
    const best = await playActivity('pond', 'perfect', 4);
    expect(idle.score).toBe(500);
    expect(mash.score).toBeLessThan(idle.score);
    expect(best.score).toBeGreaterThan(idle.score);
  }, 300000);
  it('Step Class: charts parse, a perfect run hits nearly every note, no input misses them all', async () => {
    expect(PHRASES.length).toBe(3);
    expect(parseChart(PHRASES[0].chart).length).toBeGreaterThan(40);
    const perfect = await playActivity('step', 'perfect', 2);
    const idle = await playActivity('step', 'idle', 2);
    expect(perfect.score).toBeGreaterThan(750);
    expect(idle.score).toBe(0);
  }, 300000);
  it('the same seed gives the same result', async () => {
    const a = await playActivity('hoop', 'human', 6);
    const b = await playActivity('hoop', 'human', 6);
    expect(a.score).toBe(b.score);
    expect(a.h.hash()).toBe(b.h.hash());
  }, 300000);
  it('a run continues exactly after a capture and a restore', async () => {
    const { lite } = await import('../../tools/testkit');
    const run = (h: Awaited<ReturnType<typeof lite>>, n: string, a?: object) =>
      (h.actions as unknown as { run(n: string, a?: object): void }).run(n, a);
    const h = await lite(8);
    run(h, 'game.start', { event: 'hoop' });
    run(h, 'game.bot', { kind: 'human' });
    h.step(300);
    const cap = h.capture();
    h.step(600);
    const straight = h.hash();
    h.restore(cap);
    h.step(600);
    expect(h.hash()).toBe(straight);
  }, 300000);
});

it('the tracksuit can change (the unlocked colours) and the guest still plays', async () => {
  const { lite, comp } = await import('../../tools/testkit');
  const h = await lite(3);
  const a = h.actions as unknown as { run(n: string, x?: object): void };
  a.run('game.look', { colour: 5 });
  h.step(5);
  a.run('game.start', { event: 'ring' });
  a.run('game.bot', { kind: 'perfect' });
  h.step(60 * 40);
  expect(comp<{ mode: string }>(h, 'flow')[0].mode).toBe('results');
}, 300000);
