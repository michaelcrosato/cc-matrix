// Attract (plan §19.2 "attract"): the loop plays its five segments without errors, every segment shows its features, and
// any input leaves at once.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
T('attract.five segments play through their script without errors; each shows its features', () => {
  const g = loadGame({ seed: 51 });
  const seen = new Set();
  g.bb.on('*', e => seen.add(e.type));
  g.game.go('attract', null, { fade: 0 }); g.game.advance(.3);
  let t = 0;
  while (t < 260 && g.game.sceneName === 'attract') { g.game.advance(1); t++; }
  expect(g.game.errors.length === 0, `errors: ${g.game.errors.map(e => (e.stack || e.message).split('\n')[0])}`);
  expect(seen.has('basket') && seen.has('dunkStart') && seen.has('tipoff'), 'the match shows baskets, dunks and tip-offs');
  expect(seen.has('twist') || seen.has('powerupSpawn'), 'the twists or the power-ups show');
  expect(seen.has('supernovaOn') || seen.has('shove'), 'Supernova or a shove shows');
});
T('attract.any input leaves at once, back to the title', () => {
  const g = loadGame({ seed: 52 });
  g.game.go('attract', null, { fade: 0 }); g.game.advance(.5);
  g.game.input.tap('confirm'); g.game.advance(.3);
  expect(g.game.sceneName === 'title', `after input: ${g.game.sceneName}`);
});
