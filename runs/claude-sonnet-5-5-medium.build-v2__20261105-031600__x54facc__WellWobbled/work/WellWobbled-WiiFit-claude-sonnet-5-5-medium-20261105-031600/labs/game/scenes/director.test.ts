/** @file The attract loop cycles through every showcase activity without throwing and never gets stuck. */
import { expect, it } from 'vitest';
import { comp, lite } from '../tools/testkit';

it('attract visits all showcase activities', async () => {
  const h = await lite(2, { 'game.auto': true, 'game.noTopple': true });
  const seen = new Set<string>();
  for (let i = 0; i < 60 * 165; i += 30) {
    h.step(30);
    seen.add(comp<{ event: string }>(h, 'flow')[0].event);
  }
  for (const id of ['jog', 'poseA', 'pond', 'line', 'paddle', 'garden', 'step', 'hoop', 'cliff', 'tilt'])
    expect(seen.has(id), id).toBe(true);
}, 600000);
