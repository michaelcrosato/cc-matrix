import { load } from './_load.mjs';
const { d, game, E } = load(); const I = game.input, S = () => d.S(), F = d.fn;
game.go('play', { fresh: true }); game.advance(1);
for (let i = 0; i < 60 && (d.talk.open); i++) { I.tap('confirm'); game.advance(.25); }
d.lists.thugs.length = 0; d.lists.cops.length = 0;
const map = F.getMap(); const s = d.stations().find(x => x.id === 'hatch');
console.log('hatch', s.x, s.y);
d.S().minutes = 360; for (const [n,[tx,ty]] of Object.entries({shop:[536,462], hatch:[s.x,s.y+6], cook:[696,430], gus:[680,190], sol:[136,462], counter:[136,366], south:[200,510], north:[312,62], east:[728,206], school:[152,190], jimmy:[664,430], home:[520,168]})) {
  d.hero.x = 520; d.hero.y = 184; d.hero.vx = d.hero.vy = 0;
  d.S().minutes = 360; const ff = new E.FlowField(map); let t = 0, last = 0;
  while (t < 40) { const h = d.hero, dist = Math.hypot(tx - h.x, ty - h.y); if (dist < 8) break; ff.update(tx, ty); const f = ff.dir(h.x, h.y, tx, ty) || [0, 0];
    for (const [k, c] of [['left', f[0] < -.35], ['right', f[0] > .35], ['up', f[1] < -.35], ['down', f[1] > .35]]) I.hold(k, c);
    game.advance(.05); t += .05; }
  for (const k of ['left','right','up','down']) I.hold(k, false);
  console.log(n, t < 40 ? 'reached in ' + t.toFixed(1) : 'STUCK at ' + Math.round(d.hero.x) + ',' + Math.round(d.hero.y));
}
