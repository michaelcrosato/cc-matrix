import { load } from '../test/lib/load.mjs';
import { aiMatch } from '../test/lib/bots.mjs';
const { game, G } = load({});
game.advance(.3);
const M = aiMatch(G, game, { seed: 1, skill: .48 });
let since = 0, ph = M.phase, log = [];
const off = G.bus.on('touch', e => log.push([M.now.toFixed(2), e.kind, e.p.cast, e.q, M.touches, M.side].join(' ')));
for (let i = 0; i < 120 * 600; i++) {
  game.advance(1 / 120);
  if (M.phase !== ph) { ph = M.phase; since = 0; log = log.slice(-1); } else since += 1 / 120;
  if (since > 15 && ph === 'rally') { console.log('stuck at', M.now.toFixed(2), 'L', M.L && { kind: M.L.kind, t0: M.L.t0.toFixed(2), tLand: M.L.tLand.toFixed(2), tNet: M.L.tNet, frozen: M.L.frozen, by: M.L.by }, 'plan', M.plan && { kind: M.plan.kind, p: M.plan.p.cast, tStar: M.plan.tStar.toFixed(2), done: M.plan.done }); console.log(log.slice(-14).join('\n')); break; }
  if (M.phase === 'results') { console.log('no stuck'); break; }
}
