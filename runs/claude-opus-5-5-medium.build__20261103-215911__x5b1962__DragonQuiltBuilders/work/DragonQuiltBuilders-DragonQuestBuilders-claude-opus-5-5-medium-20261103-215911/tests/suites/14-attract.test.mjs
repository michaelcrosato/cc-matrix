import { boot } from '../lib/game.mjs';
export default async ({ check }) => {
  const G = await boot(), { game, DQ, run, errs } = G;
  const store0 = JSON.stringify([...G.store.entries()].filter(([k]) => /save/i.test(k)));
  run(9.9); check('no attract at 9.9 s idle', game.sceneName === 'title', game.sceneName);
  run(.6); check('attract starts after 10 s idle', game.sceneName === 'attract', game.sceneName);
  run(1); game.input.press('KeyA'); run(1 / 120); game.input.release('KeyA'); run(.35);
  check('a key press returns to the title', game.sceneName === 'title', game.sceneName);
  run(10.3); check('idle again: attract again', game.sceneName === 'attract');
  const A = game.scene.a; let laps = 0; const seen = new Set();
  for (let i = 0; i < 400 && A.loops < 3; i++) { run(1); if (A.i >= 0) seen.add(DQ.VIGNETTES[A.i].id); }
  check('three full loops of every vignette', A.loops >= 3 && seen.size === DQ.VIGNETTES.length, A.loops + ' loops, ' + [...seen].join(','));
  check('no autopilot failures in the attract mode', !A.ap.fails.length, A.ap.fails.map(f => f.task + ':' + f.reason).join(' | '));
  game.input.feed('move', 10, 10); run(1 / 60); game.input.feed('move', 60, 60); run(.35); check('moving the mouse returns to the title', game.sceneName === 'title', game.sceneName);
  const store1 = JSON.stringify([...G.store.entries()].filter(([k]) => /save/i.test(k)));
  check('the attract mode never touches the saves', store0 === store1);
  check('no errors', !game.errors.length, errs());
};
