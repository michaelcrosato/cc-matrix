import { load } from '../lib/load.mjs';
export default async t => {
  const { G } = load(); const R = G.Rules;
  t('7-5 wins', R.setWon([7, 5], 7) === 0); t('7-6 plays on', R.setWon([7, 6], 7) === -1); t('9-7 wins', R.setWon([9, 7], 7) === 0); t('cap at 11', R.setWon([10, 11], 7) === 1);
  t('set point at 6-4', R.setPoint([6, 4], 7, 0)); t('no set point at 6-6', !R.setPoint([6, 6], 7, 0));
  t('serve rotation alternates', R.nextServer([0, 1], 0) === 1 && R.nextServer([1, 1], 0) === 0);
  const w = { perfect: .05, great: .1, ok: .16 };
  t('judge PERFECT at the edge', G.judge(.05, w) === 'PERFECT'); t('judge GREAT', G.judge(-.08, w) === 'GREAT'); t('judge OK', G.judge(.16, w) === 'OK'); t('judge MISS', G.judge(.17, w) === 'MISS');
  t('lower a quality', G.lower('PERFECT') === 'GREAT' && G.lower('OK') === 'STRETCH');
};
