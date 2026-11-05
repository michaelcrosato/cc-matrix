import { load } from './_load.mjs';
const { d, game } = load(); const snap = () => game.debug.snapshot();
game.advance(.8); d.setLastInput(Date.now() - 10500); game.advance(.5);
let t = 0, last = '';
while (t < 400) { game.advance(.5); t += .5; const s = snap(), a = d.auto();
  if (s.auto !== last) { last = s.auto; console.log(t, s.auto); }
  if (s.auto === 'Make the delivery' && Math.round(t) % 10 === 0 && t % 1 === 0) console.log('  ', t, 'hero', s.hero, 'mode', s.mode, 'contract', JSON.stringify(d.S().contract), 'bricks', d.S().bricks.length, 'screen', s.screen, 'a.t', a && a.t.toFixed(1));
  if (t > 300) break; }
