// attract: 10 s idle on the title starts it (9.9 s does not); every vignette runs with no errors; any input exits to the
// title within a step; it writes no saves, settings or Dev storage; touch-only devices still get it, and the notice
import { fresh } from '../util.mjs';
export async function run(t) {
  const { B, game, I, store } = await fresh();
  game.advance(.5); t.check('at the title', game.sceneName === 'title');
  const keys0 = [...store.keys()].sort().join(',');
  game.advance(9.3); t.check('9.9 s idle: still the title', game.sceneName === 'title');
  game.advance(.6); t.check('10 s idle: the attract mode', game.sceneName === 'attract');
  const A = B.Attract; let seen = new Set();
  for (let i = 0; i < 160 && seen.size < A.V.length; i++) { seen.add(A.vi); game.advance(1); }
  t.check('every vignette plays', seen.size === A.V.length, [...seen].join(','));
  t.check('the vignettes ran without errors', !game.errors.length, game.errors.map(e => e.where + ': ' + e.message).join(' | '));
  I.press('KeyK'); game.advance(1 / 60); I.release('KeyK'); game.advance(.5); t.check('a key exits to the title', game.sceneName === 'title');
  t.check('the player\'s state is back (none)', !B.S);
  game.advance(10.2); t.check('it starts again', game.sceneName === 'attract');
  I.press('Pad3'); game.advance(1 / 60); I.release('Pad3'); game.advance(.5); t.check('a pad button exits', game.sceneName === 'title');
  game.advance(10.8); I.feed('move', 50, 50); game.advance(.02); I.feed('move', 90, 90); game.advance(.4); t.check('the mouse moving exits', game.sceneName === 'title');
  game.advance(10.8); I.feed('down', 60, 60, { touch: true }); game.advance(.02); I.feed('up', 60, 60, { touch: true }); game.advance(.4); t.check('a tap exits', game.sceneName === 'title');
  const keys1 = [...store.keys()].filter(k => !/settings|bindings/.test(k)).sort().join(','); t.check('no saves or dev storage written', keys1 === keys0.split(',').filter(k => k && !/settings|bindings/.test(k)).join(','), keys1);
  // a touch-only device: the notice, and the attract mode still runs
  const T = await fresh({ coarse: true }); T.game.advance(.5);
  t.check('touch-only: the title knows', T.B.touchOnly());
  T.game.advance(10.2); t.check('touch-only: the attract mode runs', T.game.sceneName === 'attract');
  t.check('touch-only: no touch controls', T.game.input.touchEnabled === false);
}
