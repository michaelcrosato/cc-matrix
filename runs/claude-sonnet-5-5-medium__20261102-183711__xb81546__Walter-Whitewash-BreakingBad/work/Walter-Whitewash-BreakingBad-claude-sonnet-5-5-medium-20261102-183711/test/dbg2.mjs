import { load } from './_load.mjs';
const { d, game, E } = load(); const I = game.input, S = () => d.S(), F = d.fn;
game.go('play', { fresh: true }); game.advance(1);
for (let i = 0; i < 60 && (d.talk.open); i++) { I.tap('confirm'); game.advance(.25); }
d.lists.thugs.length = 0; d.lists.cops.length = 0;
S().ingredients = 1; d.flags().jimmyMet = 1;
const s = d.stations().find(x => x.id === 'cook');
console.log('cook station', s.x, s.y, 'hero', d.hero.x, d.hero.y);
const ff = new E.FlowField(F.getMap());
let t = 0;
while (t < 30) { const h = d.hero, dist = Math.hypot(s.x - h.x, s.y + 6 - h.y); if (dist < 8) break; ff.update(s.x, s.y + 6); const f = ff.dir(h.x, h.y, s.x, s.y + 6) || [0, 0];
  for (const [k, c] of [['left', f[0] < -.35], ['right', f[0] > .35], ['up', f[1] < -.35], ['down', f[1] > .35]]) I.hold(k, c);
  game.advance(.05); t += .05; if (Math.round(t * 20) % 40 === 0) console.log(t.toFixed(1), Math.round(h.x), Math.round(h.y), 'dir', f.map(v => v.toFixed(2)).join(','), 'dist', dist.toFixed(0)); }
console.log('end', t, d.hero.x, d.hero.y);
