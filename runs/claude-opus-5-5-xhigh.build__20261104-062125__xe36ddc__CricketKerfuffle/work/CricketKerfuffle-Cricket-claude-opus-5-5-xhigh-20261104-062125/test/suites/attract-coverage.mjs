import { load, until } from '../lib.mjs';
export async function run(check) {
  const { game, I, D, K } = load({ seed: 5 }); game.advance(.5); K.coverage.reset();
  game.advance(10.5); check('10 s idle on the title starts the attract mode', D.snapshot().scene === 'attract', D.snapshot().scene);
  const segs = new Set(); let t = 0;
  while (t < 720) { game.advance(1); t += 1; if (D.snapshot().scene === 'attract') segs.add(D.snapshot().attract.segment); }
  check('every attract segment ran (10)', segs.size === K.ATTRACT.length, [...segs]);
  const cov = K.coverage.seen;
  const want = { item: k => /^item:/.test(k), chaos: k => /^chaos:/.test(k), four: k => k === 'four', six: k => k === 'six', target: k => k === 'target', review: k => k === 'review', bowled: k => k === 'out:bowled', caught: k => k === 'out:caught', 'run out': k => k === 'out:run out', third: k => k === 'third', stumped: k => k === 'out:stumped', special: k => k === 'special', fire: k => k === 'fire', rain: k => k === 'rain', fog: k => k === 'fog', 'crowd catch': k => k === 'crowdcatch', ghosts: k => k === 'chaos:ghosts', night: k => k === 'night' };
  for (const [name, f] of Object.entries(want)) check('the showreel covers ' + name, Object.keys(cov).some(f), Object.keys(cov).filter(k => !/^(del|shot|cam|ground|attract):/.test(k)).join(' '));
  check('no errors in 12 minutes of attract mode', !game.errors.length, game.errors.slice(0, 3).map(e => e.message));
  I.press('KeyA'); game.advance(1 / 60); I.release('KeyA'); game.advance(.8); check('a key press returns to the title', D.snapshot().scene === 'title', D.snapshot().scene);
  game.advance(10.5); check('the attract mode starts again after 10 s more', D.snapshot().scene === 'attract');
  game.advance(2); I.feed('move', 40, 40); game.advance(.1); I.feed('move', 80, 60); game.advance(.8); check('moving the mouse leaves the attract mode', D.snapshot().scene === 'title', D.snapshot().scene);
  game.advance(10.5); game.advance(2); I.press('Pad3'); game.advance(1 / 60); I.release('Pad3'); game.advance(.8); check('a pad button (Triangle) leaves the attract mode', D.snapshot().scene === 'title', D.snapshot().scene);
}
