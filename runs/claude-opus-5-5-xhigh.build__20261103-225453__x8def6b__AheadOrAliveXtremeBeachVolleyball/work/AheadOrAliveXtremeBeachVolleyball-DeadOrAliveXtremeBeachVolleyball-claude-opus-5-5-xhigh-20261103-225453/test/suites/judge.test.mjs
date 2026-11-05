import { load } from '../lib/load.mjs';
export default function (t) {
  const { G } = load({});
  const J = G.VB.judge, T = G.T;
  t.ok('PERFECT at the window edge', J(T.perfectWin, 1) === 'PERFECT' && J(-T.perfectWin, 1) === 'PERFECT');
  t.ok('GREAT just past perfect', J(T.perfectWin + .001, 1) === 'GREAT' && J(T.greatWin, 1) === 'GREAT');
  t.ok('OK to the ok window', J(T.okWin, 1) === 'OK'); t.ok('MISS past it', J(T.okWin + .001, 1) === 'MISS');
  t.ok('Generous widens', J(T.okWin * 1.5, 1.6) === 'OK'); t.ok('Tight narrows', J(T.perfectWin * .95, .8) === 'GREAT');
  t.ok('lowering steps PERFECT>GREAT>OK>STRETCH>MISS', G.VB.lower('PERFECT') === 'GREAT' && G.VB.lower('OK') === 'STRETCH' && G.VB.lower('STRETCH') === 'MISS');
}
