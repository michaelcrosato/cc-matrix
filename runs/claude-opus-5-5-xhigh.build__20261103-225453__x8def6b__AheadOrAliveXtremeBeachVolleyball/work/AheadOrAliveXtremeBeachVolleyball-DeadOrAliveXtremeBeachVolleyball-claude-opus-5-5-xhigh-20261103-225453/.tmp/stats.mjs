import { load } from '../test/lib/load.mjs';
import { aiMatch, runMatch } from '../test/lib/bots.mjs';
const { game, G } = load({});
game.advance(.3);
const kinds = {}, lens = [], touchK = {}, q = {};
const off = G.bus.on('touch', e => { touchK[e.kind] = (touchK[e.kind] || 0) + 1; const k = e.kind + ':' + e.q; q[k] = (q[k] || 0) + 1; });
for (let s = 1; s <= 4; s++) { const M = aiMatch(G, game, { seed: s, skill: .5 }), I = runMatch(G, game, M); for (const p of I.points) { kinds[p.kind] = (kinds[p.kind] || 0) + 1; lens.push(p.rally); } }
console.log('point kinds', kinds); console.log('rally lens', lens.join(',')); console.log('touch kinds', touchK); console.log(q);
