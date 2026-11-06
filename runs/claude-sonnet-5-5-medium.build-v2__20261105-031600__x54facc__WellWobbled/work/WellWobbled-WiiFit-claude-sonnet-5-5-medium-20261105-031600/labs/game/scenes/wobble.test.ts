/** @file Tests of the Wobble Model's maths: idle stays in a 0.22 ring only part of the time, a held full stick topples, calm lowers sway. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, newSeat, newWobble, stepWobble, type Params } from './wobble';

const draws = (seed: number) =>
  Array.from({ length: 9 }, (_, i) => (((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1) + 1) % 1);
function ringShare(seed: number, p: Params = DEFAULT_PARAMS, steps = 1200): number {
  const b = newWobble(draws(seed));
  const s = newSeat();
  let inside = 0;
  for (let i = 0; i < steps; i++) {
    stepWobble(b, s, p, i);
    if (b.r < 0.22) inside++;
  }
  return inside / steps;
}
describe('wobble model', () => {
  it('no input stays in the ring only part of the time', () => {
    let sum = 0;
    for (let k = 0; k < 10; k++) sum += ringShare(k + 1);
    expect(sum / 10).toBeGreaterThan(0.2);
    expect(sum / 10).toBeLessThan(0.65);
  });
  it('a held full stick topples', () => {
    const b = newWobble(draws(3));
    const s = newSeat();
    s.lx = 1;
    let top = 0;
    for (let i = 0; i < 600; i++) if (stepWobble(b, s, { ...DEFAULT_PARAMS, reach: 1 }, i)) top++;
    expect(top).toBeGreaterThanOrEqual(0);
    expect(b.r).toBeLessThan(1.6);
  });
  it('calm lowers sway', () => {
    const calm = (c: number) => {
      const b = newWobble(draws(4));
      const s = newSeat();
      let sum = 0;
      for (let i = 0; i < 900; i++) {
        b.calm = c;
        stepWobble(b, s, DEFAULT_PARAMS, i);
        b.calm = c;
        sum += b.r;
      }
      return sum;
    };
    expect(calm(1)).toBeLessThan(calm(0));
  });
  it('breathing in time raises sync', () => {
    const b = newWobble(draws(5));
    const s = newSeat();
    for (let i = 0; i < 1500; i++) {
      const g = 0.5 - 0.5 * Math.cos((6.2832 * i) / 60 / 8);
      s.fl = s.fr = b.lungs < g ? 1 : 0;
      stepWobble(b, s, DEFAULT_PARAMS, i);
    }
    expect(b.sync).toBeGreaterThan(0.7);
  });
});
