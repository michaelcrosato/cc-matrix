/** @file reps: the four stand-in players meet the balance targets on 10 seeds (perfect >= 750, human-like >= 550, sloppy >= 300, idle <= 500 and below human-like), random mashing never throws, idle finishes by itself. */
import { it } from 'vitest';
import { balanceReport, expectTargets, mashSafe } from './suite';

it('reps balance', async () => {
  expectTargets('reps', await balanceReport('reps', 10));
  await mashSafe('reps');
}, 1800000);
