// attract: 10 s idle on the title starts it (9.9 s does not); every vignette runs to its end with no errors; any input
// exits at once; it writes no saves or settings; on a touch-only device the notice shows and attract still runs
import { boot } from '../harness.mjs';
export default async check => {
  let { B, game, I, store } = await boot();
  game.advance(9.5); check('9.9 s idle: still the title', game.sceneName === 'title');
  game.advance(.8); game.advance(.5); check('10 s idle starts the attract mode', game.sceneName === 'attract', game.sceneName);
  const keys0 = [...store.keys()].filter(k => !k.includes('settings')).sort().join();
  const seen = new Set(); let t = 0;
  while (t < 160) { game.advance(.5); t += .5; if (B.Attract.v) seen.add(B.Attract.v.name); if (seen.size === B.VIGNETTES.length && B.Attract.i >= B.VIGNETTES.length) break; }
  check('every vignette runs', B.VIGNETTES.every(v => seen.has(v.name)), [...seen].join(','));
  check('no errors in the attract loop', !game.errors.length, game.errors.map(e => e.where + ': ' + e.message).join(' | '));
  check('the demo writes no saves or dev storage', [...store.keys()].filter(k => !k.includes('settings')).sort().join() === keys0, [...store.keys()].join());
  I.press('KeyK'); game.advance(1 / 60); I.release('KeyK'); game.advance(.6);
  check('any key returns to the title', game.sceneName === 'title', game.sceneName);
  check('the player state is untouched', B.S === null);
  game.advance(10.5); game.advance(.4); check('it starts again after another 10 s', game.sceneName === 'attract');
  I.press('Pad3'); game.advance(1 / 60); I.release('Pad3'); game.advance(.6); check('a pad button exits too', game.sceneName === 'title');
  // a touch-only device
  ({ B, game, I } = await boot({ coarse: true }));
  check('touch-only: the notice shows', B.touchOnly() && game.input.touchEnabled === false);
  game.advance(10.6); game.advance(.4); check('touch-only: the attract mode still runs', game.sceneName === 'attract');
};
