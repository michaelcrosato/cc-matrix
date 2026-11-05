import { load } from '../test/lib/load.mjs';
const { game, G } = load({});
game.advance(.3);
game.go('charselect', null, { fade: 0 }); game.advance(.1); game.scene.pick('ingrid');
for (let i = 0; i < 120 * 40; i++) {
  const D = G.talk;
  if (i % 240 === 0) console.log((i / 120).toFixed(1), game.sceneName, D && D.open, D && D.modal, D && D.name, D && D.typing, D && D.i, D && D.pages.length, game.scene.job && game.scene.job.done, game.errors.length);
  if (D && D.open && D.modal && i % 6 === 0) game.input.tap('confirm');
  game.advance(1 / 120);
  if (game.sceneName === 'match') { console.log('match!', (i / 120).toFixed(1)); break; }
}
console.log(game.errors.map(e => e.message));
