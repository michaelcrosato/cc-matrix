/** @file jog: the four stand-in players meet the balance targets on 10 seeds (perfect >= 750, human-like >= 550, sloppy >= 300, idle <= 500 and below human-like), random mashing never throws, idle finishes by itself. */
import { it } from 'vitest';
import { balanceReport, expectTargets, mashSafe } from './suite';

it('jog balance', async () => {
  expectTargets('jog', await balanceReport('jog', 10));
  await mashSafe('jog');
}, 1800000);
