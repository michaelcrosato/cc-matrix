/** @file The Gull wanders and the Frog hops in the full island world, Plumb carries the plait's secondary-motion component, and the guest really walks The Line (the position moves along the rope as the bot steps). */
import { expect, it } from 'vitest';
import { createHeadless } from '../../../engine';
import { comp, lite } from '../tools/testkit';
import './island';

type Actor = { cast: { who: string }; actor: { x: number; y: number; z: number } };
it('the critters move, the plait exists, the guest walks the line', async () => {
  const h = await createHeadless({ scene: 'game:island', seed: 4 });
  const at = (who: string) => {
    const e = (h.state('actor').entities as unknown as (Actor & Record<string, unknown>)[]).find(
      (x) => x.cast?.who === who,
    )!;
    return e;
  };
  const g0 = at('gull').actor.x;
  const f0 = at('frog').actor.y;
  let frogMoved = false;
  for (let i = 0; i < 60; i++) {
    h.step(20);
    if (Math.abs(at('frog').actor.y - f0) > 0.15) frogMoved = true;
  }
  expect(Math.abs(at('gull').actor.x - g0)).toBeGreaterThan(1);
  expect(frogMoved).toBe(true);
  expect(Object.keys(at('plumb'))).toContain('secondary');
  const run0 = h.actions as unknown as { run(n: string, a?: object): void };
  run0.run('game.start', { event: 'tilt' });
  const p0 = at('plumb').actor.x;
  let swayed = false;
  for (let i = 0; i < 40; i++) {
    h.step(30);
    if (Math.abs(at('plumb').actor.x - p0) > 0.2) swayed = true;
  }
  expect(swayed).toBe(true); // in the storm Plumb sways, so the plait swings
  const l = await lite(2);
  const run = l.actions as unknown as { run(n: string, a?: object): void };
  run.run('game.start', { event: 'line' });
  run.run('game.bot', { kind: 'perfect' });
  const z0 = (l.state('actor').entities as unknown as Actor[]).find((x) => x.cast?.who === 'guest')!.actor.z;
  l.step(60 * 3);
  const zMid = (l.state('actor').entities as unknown as Actor[]).find((x) => x.cast?.who === 'guest')!.actor.z;
  l.step(60 * 9);
  const z1 = (l.state('actor').entities as unknown as Actor[]).find((x) => x.cast?.who === 'guest')!.actor.z;
  expect(comp<{ id: string; a: number[] }>(l, 'act').find((x) => x.id === 'line')!.a[1]).toBeGreaterThan(5);
  expect(z1 - zMid).toBeGreaterThan(3);
  void z0;
}, 600000);
