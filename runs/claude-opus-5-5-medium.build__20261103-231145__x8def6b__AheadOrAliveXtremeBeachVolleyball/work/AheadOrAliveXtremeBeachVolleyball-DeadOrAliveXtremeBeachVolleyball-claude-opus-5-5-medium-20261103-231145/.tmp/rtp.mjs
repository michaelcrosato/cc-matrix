import { load } from '../test/lib/load.mjs';
const { G } = load();
for (const bet of [1, 2, 3]) { let paid = 0, cost = 0; const N = 21 ** 3; for (let a = 0; a < 21; a++) for (let b = 0; b < 21; b++) for (let c = 0; c < 21; c++) { cost += bet; paid += G.slotWin([a, b, c], bet).win; } console.log('bet', bet, 'RTP', (paid / cost * 100).toFixed(1)); }
