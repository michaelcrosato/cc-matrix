// node tests/band.mjs actId [tier]: bots through an activity, prints stars per skill
import { loadGame } from './lib.mjs';
const [id, tier = '1'] = process.argv.slice(2);
const { G, game } = loadGame({ draw: !process.argv.includes('nodraw') });
G.S.started = true; game.advance(.3);
for (const sk of ['passive', 'poor', 'average', 'good', 'expert']) {
  const out = [];
  for (const seed of [3, 5, 8]) {
    game.go('act_' + id, { tier: +tier, mode: 'free', seed, skipCard: true }); game.advance(.2);
    const run = G.curRun; if (sk !== 'passive') run.cs[0].bot = new G.Bot(sk, G.E.rng(seed + 1));
    game.advance(3.2); let n = 0; while (!run.done && n++ < 400) game.advance(1);
    out.push(Math.round(run.cs[0].pct * 100) + '%/' + G.starsOf(run.cs[0].pct, run.def, +tier) + '★');
  }
  console.log(id, tier, sk.padEnd(8), out.join('  '));
}
console.log('errors', game.errors.map(e => e.where + ': ' + e.message).slice(0, 4));
