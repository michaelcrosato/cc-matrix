import { load } from '../lib/load.mjs';
export default async t => {
  const { G, game } = load(); game.advance(1);
  G.go('title', null, { fade: 0 }); game.advance(.5); G.attract.reset();
  game.advance(9.4); t('9.9 s idle stays on the title', !G.attract.active && game.sceneName === 'title');
  game.advance(.7); t('10 s idle starts the attract', G.attract.active, G.attract.idle);
  game.advance(2); t('it plays a match first', game.sceneName === 'match' && G.M.spectacle);
  const seen = [];
  for (let s = 0; s < 120; s++) { game.advance(1); const b = G.attract.BEATS[G.attract.beat].id; if (seen[seen.length - 1] !== b) seen.push(b); }
  t('then the montage beats in order', seen.join(',').includes('map,gift,shop,poolhop,casino,photo,final'), seen.join(','));
  game.input.tap('confirm'); game.advance(1);
  t('any input returns to the title', !G.attract.active && game.sceneName === 'title', game.sceneName);
  t('no errors', game.errors.length === 0, game.errors.map(e => e.message + (e.stack || '').split('\n')[1]).join(' | '));
};
