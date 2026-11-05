import { load } from '../lib/load.mjs';
export default async t => {
  const { G } = load();
  let paid = 0, n = 0; for (let a = 0; a < 21; a++) for (let b = 0; b < 21; b++) for (let c = 0; c < 21; c++) { paid += G.slotWin([a, b, c], 1).win; n++; }
  const rtp = paid / n; t('slots return 89-95% (exact over every stop)', rtp >= .89 && rtp <= .95, rtp);
  t('7-7-7 pays 100', G.slotLine('7', '7', '7') === 100); t('Sonny is wild', G.slotLine('BAR', 'SONNY', 'BAR') === 30); t('one cherry pays 2', G.slotLine('CHERRY', 'COCO', 'PALM') === 2);
  t('roulette straight pays 35:1', G.roulettePay({ kind: 'num', v: 17 }, 17) === 36); t('red pays 1:1', G.roulettePay({ kind: 'red' }, 1) === 2 && G.roulettePay({ kind: 'red' }, 2) === 0);
  t('dozens pay 2:1', G.roulettePay({ kind: 'dozen', v: 2 }, 20) === 3); t('columns', G.roulettePay({ kind: 'col', v: 1 }, 34) === 3); t('zero loses outside bets', G.roulettePay({ kind: 'even' }, 0) === 0);
  t('wheel order', G.WHEEL.length === 37 && G.WHEEL[1] === 32 && new Set(G.WHEEL).size === 37);
  G.seed('casino', 1); const counts = new Array(37).fill(0); for (let i = 0; i < 37000; i++) counts[G.WHEEL[Math.floor(G.rng('casino') * 37)]]++; const chi = counts.reduce((a, c) => a + (c - 1000) ** 2 / 1000, 0); t('wheel results uniform (chi-square)', chi < 80, chi);
  const BJ = G.BJ, h = (...r) => r.map(x => ({ r: x, s: '♠' }));
  t('blackjack values', BJ.value(h('A', 'K')).v === 21 && BJ.bj(h('A', 'K')) && BJ.value(h('A', 'A', '9')).v === 21 && BJ.value(h('K', 'Q', '5')).v === 25);
  t('soft 17 is soft', BJ.value(h('A', '6')).soft && BJ.value(h('A', '6')).v === 17);
  BJ.newShoe(); t('six-deck shoe', BJ.shoe.length === 312);
};
