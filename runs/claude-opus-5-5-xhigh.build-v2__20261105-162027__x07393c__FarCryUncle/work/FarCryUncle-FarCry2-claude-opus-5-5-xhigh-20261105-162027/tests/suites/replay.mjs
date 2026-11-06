// Replay: record one mission segment, replay it, compare engine.fingerprint().
import { Engine } from '../../pixel-engine.js';
import { createGame } from '../../src/game.js';
export const name = 'replay';
export const covers = ['src', 'pixel-engine.js'];
export async function run(t) {
  const game = createGame({ skipEpigraph: true });
  const e = await Engine.headless(game, { camera: { preset: 'first' }, viewport: { width: 1920, height: 1080, dpr: 1 }, seed: 3 });
  const input = e.input;
  const hold = (code, n) => { input.setKey(code, true); e.step(n, 1 / 60); input.setKey(code, false); e.step(2, 1 / 60); };
  // Through the menus into a fresh campaign, then play with real keys.
  e.step(3, 1 / 60);
  hold('Enter', 2);
  e.step(4, 1 / 60);
  t.ok('in menus', game.state().screen === 'main');
  t.eq('new game has the focus', game.state().items[game.state().focus], 'new');
  hold('Enter', 2);
  e.step(200, 1 / 60);
  t.eq('new game runs', game.state().mission, 'm0');
  for (let k = 0; k < 6; k++) { input.addPointer(30, 0); hold('KeyW', 30); hold('Space', 4); hold('KeyM', 2); e.step(30, 1 / 60); hold('KeyM', 2); }
  const end = e.fingerprint();
  const rec = e.recording();
  t.ok('recording has frames', (rec.frames?.length ?? 0) > 100);
  await e.replay(rec, () => e.loadGame(createGame({ skipEpigraph: true })));
  const again = e.fingerprint();
  t.eq('replay ends in the same place', again, end);
  e.dispose();
}
