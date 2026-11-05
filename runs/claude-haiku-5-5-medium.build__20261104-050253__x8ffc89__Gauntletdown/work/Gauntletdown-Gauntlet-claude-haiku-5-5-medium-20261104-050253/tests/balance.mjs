import { boot } from './lib.mjs';
const { game, I, snap, errors } = boot();
const cls = process.argv[2] || 'berserker', diff = process.argv[3] || 'normal', runs = +(process.argv[4] || 3);
for (let run = 0; run < runs; run++) {
  game.advance(.2);
  game.debug.start([cls]);
  game.advance(.2);
  const W = game.debug.world();
  W.heroes.forEach(h => { h.input = null; });
  game.go('card', { index: 0, first: true }, { fade: 0 }); game.advance(.2);
  // move to the play scene (the card waits 6 s or a press)
  game.advance(7); let t = 0, floors = 0, lastFloor = 0; const log = [];
  while (t < 60 * 25) {
    game.advance(.5); t += .5;
    const q = snap();
    if (q.scene === 'gameover' || q.scene === 'title') { log.push('OVER at ' + Math.round(t) + 's floor ' + q.floor); break; }
    if (q.scene === 'ending') { log.push('ENDING at ' + Math.round(t) + 's'); break; }
    if (q.floor !== lastFloor) { log.push('floor ' + q.floor + ' at ' + Math.round(t) + 's hp ' + q.heroes[0].hp + ' score ' + q.heroes[0].score); lastFloor = q.floor; }
    if (errors.length) { log.push("ERR " + errors[0].slice(0, 300)); break; }
  }
  console.log('run', run + 1, cls, diff, '|', log.join(' | '), '| kills', snap().kills);
}
