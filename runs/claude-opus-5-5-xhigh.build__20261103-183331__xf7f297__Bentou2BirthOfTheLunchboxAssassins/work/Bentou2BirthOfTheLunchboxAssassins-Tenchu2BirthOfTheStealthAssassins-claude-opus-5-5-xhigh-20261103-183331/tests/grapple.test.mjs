// grapple: the anchor at an edge; a tap pulls the hero up; no anchor through a wall; range and rise follow the sliders;
// the mouse picks the anchor under it
import { loadYard, C } from './lib.mjs';
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  const M = loadYard(t), h = M.hero, G = B.Grapple;
  game.debug.teleport(C(15), C(8), 0, -Math.PI / 2); t.step(.2);
  let list = G.anchors(h, M); check('an anchor at the storehouse edge', list.some(a => a.z === 48 && a.cx >= 14 && a.cx <= 16), list.map(a => a.cx + ',' + a.cy + '@' + a.z).join(' '));
  t.intent({ grapplePressed: true }, 1 / 120); t.intent({}, 1.6);
  check('a tap pulls the hero onto the roof', Math.abs(h.z - 48) < 1, h.z);
  game.debug.teleport(C(12), C(5), 0, Math.PI); t.step(.1);
  list = G.anchors(h, M); check('no anchor through a wall (the townhouse\'s far side)', !list.some(a => a.cx === 8 && a.nx === -1), list.map(a => a.cx + ',' + a.cy + ' n' + a.nx).join(' '));
  game.debug.teleport(C(15), C(12), 0, -Math.PI / 2); t.step(.1);
  const far = G.anchors(h, M).filter(a => a.z === 48).length; game.debug.tune('grappleRange', 64); const near = G.anchors(h, M).filter(a => a.z === 48).length; game.debug.resetTune();
  check('the range slider limits the reach', far > 0 && near === 0, far + ' then ' + near);
  // the mouse: the anchor drawn nearest the pointer wins
  game.debug.teleport(C(12), C(8), 0, -Math.PI / 2); t.step(.1); list = G.anchors(h, M);
  list.forEach((a, i) => { a.sx = i * 40; a.sy = 50; }); const want = list[list.length - 1], was = game.input.pointer;
  game.input.pointer = () => [want.sx + 2, 51]; const pick = G.pick(h, { mouseMode: true, move: [0, 0] }, list); game.input.pointer = was;
  check('the mouse picks the anchor under it', pick === want, pick && pick.cx);
}
