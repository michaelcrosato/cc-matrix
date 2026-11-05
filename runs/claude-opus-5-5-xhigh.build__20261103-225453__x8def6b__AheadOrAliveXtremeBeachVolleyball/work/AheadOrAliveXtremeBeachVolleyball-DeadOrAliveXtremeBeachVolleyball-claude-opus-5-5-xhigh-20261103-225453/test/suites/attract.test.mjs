import { load } from '../lib/load.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.5); game.go('title', null, { fade: 0 }); game.advance(.1);
  game.advance(9.8); t.ok('9.9 s idle stays on the title', !G.attract && game.sceneName === 'title');
  game.advance(.3); t.ok('10 s idle starts the attract', !!G.attract, String(G.attractT));
  game.advance(1); t.ok('it plays a match first', game.sceneName === 'match' && G.M && G.M.spectacle);
  const order = []; let last = null; for (let i = 0; i < 120 * 140; i++) { game.advance(1 / 120); if (G.attract && G.attract.beat !== last) { last = G.attract.beat; order.push(last); } if (order.length >= 9) break; }
  t.ok('then the montage beats in order', order.join(',').startsWith('match,map,friends,suits,pool,casino,photo,final,card'), order.join(','));
  t.ok('a demo state, never the save', !G.unlocks.album.length);
  game.input.tap('confirm'); game.advance(.5); t.ok('any input returns to the title', !G.attract && game.sceneName === 'title');
  game.advance(.2); t.ok('with the input consumed (no menu opened)', game.sceneName === 'title');
  // from the menu too, and a mouse move ends it
  game.go('menu', null, { fade: 0 }); game.advance(10.3); t.ok('the menu idles into it too', !!G.attract);
  game.input.lastDevice = 'mouse'; game.input.feed('move', 10, 10); game.advance(.05); game.input.feed('move', 40, 40); game.advance(.4); t.ok('a mouse move ends it', !G.attract);
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 3).map(e => (e.where || '') + ' ' + e.message).join('|'));
}
