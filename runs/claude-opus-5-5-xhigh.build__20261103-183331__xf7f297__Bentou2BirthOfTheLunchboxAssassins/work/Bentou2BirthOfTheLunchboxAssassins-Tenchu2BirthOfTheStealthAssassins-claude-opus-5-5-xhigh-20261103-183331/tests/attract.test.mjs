// attract: three loops, every vignette visited, no errors, no beat needed its timeout
export default async function (t) {
  const { B, check, game } = t; t.step(.3);
  game.go('attract', { i: 0 }, { fade: 0 });
  let s = 0; while (B.Attract.loops < 3 && s < 900) { t.step(1); s++; if (game.sceneName !== 'attract') break; }
  check('attract runs three loops', B.Attract.loops >= 3, B.Attract.loops + ' loops in ' + s + ' s, scene ' + game.sceneName);
  const v = B.Attract.VIGNETTES.filter(x => (B.Attract.visits[x.id] || 0) < 3).map(x => x.id);
  check('every vignette was visited each loop', !v.length, v.join(' ') + ' ' + JSON.stringify(B.Attract.visits));
  check('no beat needed its timeout', !B.Attract.log.length, B.Attract.log.slice(0, 6).join('; '));
  t.tap('attack'); t.step(.6); check('any input returns to the title', game.sceneName === 'title', game.sceneName);
}
