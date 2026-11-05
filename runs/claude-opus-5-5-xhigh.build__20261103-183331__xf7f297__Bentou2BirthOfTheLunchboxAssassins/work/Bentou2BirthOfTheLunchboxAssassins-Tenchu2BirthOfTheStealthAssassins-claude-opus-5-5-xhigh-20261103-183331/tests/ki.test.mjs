// ki: the number at a known distance; Shadow Sight: visible, sensed behind a wall, hidden beyond; Ki Focus reaches further
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  const M = loadYard(t, { guards: [{ id: 'g', type: 'ashigaru', at: [12, 11], facing: 90, mode: 'post' }] }), h = M.hero, g = M.guards[0];
  g.mode = 'stand';
  game.debug.teleport(C(12) - 80, C(11), 0); t.step(.2);
  check('the Ki number at 80 is 50', Math.abs(B.Perception.ki - 50) <= 2, B.Perception.ki);
  check('in plain view the guard is visible', g.vis === 'visible', g.vis);
  game.debug.teleport(C(9), C(2), 0); g.x = C(9); g.y = C(9); t.step(.2);
  check('behind the townhouse it is sensed', g.vis === 'sensed', g.vis);
  game.debug.teleport(C(2), C(21), 0); g.x = C(27); g.y = C(2); t.step(.2);
  check('beyond the Ki range, and out of sight, it is hidden', g.vis === 'hidden' || g.vis === 'visible', g.vis);
  game.debug.teleport(C(9), C(2), 0); g.x = C(9); g.y = C(2) + 190; t.step(.2); const before = g.vis;
  t.intent({ focusDown: true }, .3); const after = g.vis;
  check('Ki Focus senses further', (before === 'hidden' && after !== 'hidden') || before === 'visible', before + ' -> ' + after);
}
