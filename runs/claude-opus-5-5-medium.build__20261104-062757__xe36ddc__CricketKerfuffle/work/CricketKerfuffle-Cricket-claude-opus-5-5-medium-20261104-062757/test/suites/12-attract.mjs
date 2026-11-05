// 5.18: idle 10 s on the title starts the showreel; every segment runs and its moments happen; any input exits
export default ({ boot, suite, until }) => {
  const s = suite(), { D, game, I } = boot();
  game.advance(9); s.ok('9 s idle: still the title', D.snapshot().scene === 'title');
  game.advance(1.5); s.ok('10 s idle: the attract mode', D.snapshot().scene === 'attract');
  const seen = new Set(); for (let t = 0; t < 60 * 6; t += .5) { game.advance(.5); if (D.snapshot().scene !== 'attract') break; seen.add(D.snapshot().attract.segment); }
  s.ok('every segment ran', seen.size === D.SEGMENTS.length, [...seen]);
  const C = D.COVER, need = ['item:teapot', 'boundary', 'target', 'review', 'out:bowled', 'out:caught', 'out:run out', 'out:stumped', 'out:lbw', 'chaos:cow', 'chaos:tide', 'chaos:rain', 'chaos:ghosts', 'fire', 'replay'];
  s.ok('the showreel covers the moments', need.every(k => C[k] > 0), need.filter(k => !(C[k] > 0)));
  s.ok('a special was played in the showreel', Object.keys(C).some(k => k.startsWith('special:')));
  s.ok('night and fog are shown', D.SEGMENTS.some(x => x.time === 'night') && D.SEGMENTS.some(x => x.weather === 'fog'));
  for (let k = 0; k < 3 && D.snapshot().scene !== 'title'; k++) { I.press('KeyA'); game.advance(1 / 30); I.release('KeyA'); until(game, () => D.snapshot().scene === 'title', 1); }
  s.ok('a key returns to the title', D.snapshot().scene === 'title');
  game.advance(10.5); s.ok('idle again: the attract mode again', D.snapshot().scene === 'attract'); game.advance(.6);
  I.feed('move', 50, 50); game.advance(1 / 60); I.feed('move', 80, 60); until(game, () => D.snapshot().scene === 'title', 2);
  s.ok('a mouse move exits it', D.snapshot().scene === 'title');
  game.advance(10.5); game.advance(.6); I.press('Pad3'); game.advance(1 / 60); I.release('Pad3'); until(game, () => D.snapshot().scene === 'title', 2);
  s.ok('a pad button exits it', D.snapshot().scene === 'title');
  s.noErrors(game);
};
