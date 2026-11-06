/** @file hoop: the four stand-in players meet the balance targets on 10 seeds (perfect >= 750, human-like >= 550, sloppy >= 300, idle <= 500 and below human-like), random mashing never throws, idle finishes by itself. */
import { it } from 'vitest';
import { balanceReport, expectTargets, mashSafe } from './suite';

it('hoop balance', async () => {
  expectTargets('hoop', await balanceReport('hoop', 10));
  await mashSafe('hoop');
}, 1800000);
