import { load } from '../lib/load.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3); const T = game.debug.tools;
  T.match({ seed: 4 }); for (let i = 0; i < 240; i++) game.advance(1 / 120);
  const items = game.o.menu.items().filter(Boolean).map(x => x[0]);
  t.ok('the pause menu lists Dev Mode', items.includes('Dev Mode') && items.includes('How to Play'), items.join(','));
  const now0 = G.M.now; G.devPanel.open(); game.advance(.5); t.ok('opening it freezes time', Math.abs(G.M.now - now0) < .02 && !!G.overlay.get('dev'));
  const D = G.devPanel.ov; D.tab = 5; const sl = G.devPanel.items(D).find(i => i.tkey === 'ballGravity'); t.ok('the gravity slider is on the Tuning tab', !!sl && sl.x >= 0 && sl.x + sl.w <= game.W);
  sl.onRight(); sl.onRight(); t.ok('moving a slider changes G.T', G.T.ballGravity === 340);
  const L1 = G.Ball.make(0, [300, 240, 40], [0, 0, 100]); G.setTuning('ballGravity', 480); const L2 = G.Ball.make(0, [300, 240, 40], [0, 0, 100]);
  t.ok('and the behavior: more gravity, a shorter flight', L2.tLand < L1.tLand, L1.tLand.toFixed(2) + ' > ' + L2.tLand.toFixed(2));
  G.resetTuning(); t.ok('Reset all restores the defaults', G.T.ballGravity === 330 && Object.keys(G.tuningChanged()).length === 0);
  G.devPanel.close(); game.advance(.2); t.ok('closing restores time', G.M.now > now0);
  T.goto('location', { loc: 'promenade' }); game.advance(.3); t.ok('jump to a location', game.sceneName === 'location' && game.scene.loc === 'promenade');
  T.goto('poolhop', {}); game.advance(.2); t.ok('jump to a minigame', game.sceneName === 'poolhop');
  T.setDay(4, 1); t.ok('set the day and slot', G.state.day === 4 && G.state.slot === 1);
  T.addMoney(10000); T.chips(100); t.ok('money and chips', G.state.money >= 10000 && G.state.chips >= 100);
  T.fillBag(); t.ok('fill the gift bag', Object.keys(G.state.bag).length === 25);
  T.slotsForce('7'); T.goto('casino', { station: 'slots' }); game.advance(.1); game.input.tap('confirm'); game.advance(.2); for (const r of ['reel1', 'reel2', 'reel3']) { game.input.tap(r); game.advance(.1); }
  t.ok('slots: force 7-7-7', game.scene.slot.win && game.scene.slot.win.total >= 100, JSON.stringify(game.scene.slot.win));
  T.rouletteForce(17); t.ok('roulette: force a number', G.ROULETTE.spin() === 17);
  t.ok('the snapshot reports the scene', game.debug.snapshot().scene === 'casino');
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 2).map(e => e.message).join('|'));
}
