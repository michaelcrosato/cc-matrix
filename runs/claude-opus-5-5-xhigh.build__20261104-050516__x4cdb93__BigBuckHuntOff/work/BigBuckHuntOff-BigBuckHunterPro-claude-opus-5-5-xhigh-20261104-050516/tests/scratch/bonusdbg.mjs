import { load } from '../lib/load.mjs';
const [hunt = 'hollow', mode = 'bonusOnly'] = process.argv.slice(2);
const L = load({}), X = L.game.debug.internals, D = L.game.debug; L.step(1);
X.startHunt({ mode, hunt, seed: 2 }); L.step(.6); const H = X.G.hunt;
for (let t = 0; t < 70; t += .5) {
  const k = H.seg && H.seg.kind; if (k === 'dialog') L.I.tap('cancel'); else if (k !== 'bonus' && k !== 'range') L.I.tap('confirm');
  if (!H.players[0].bot) D.bot(true, { skill: 'average' }); L.step(.5);
  const B = H.bonus, bot = H.players[0].bot;
  if (B && t % 2 === 0) { const vis = B.targets.filter(T => T.alive).map(T => { const q = H.lens.project(T.x, T.y, T.z); return T.kind + (q ? '@' + Math.round(q[0]) + ',' + Math.round(q[1]) : '@off'); }); console.log(k, 't', B.t.toFixed(1), 'shots', B.shots, 'hits', B.hits, 'tgt', bot.target && bot.target.kind, 'dbg', (bot.dbg||[]).map(v=>v.toFixed(1)).join('/'), 'ch', H.players[0].rifle.chambered, H.players[0].rifle.busy, 'rx', Math.round(H.players[0].rx), Math.round(H.players[0].ry), '|', vis.slice(0, 6).join(' ')); }
}
