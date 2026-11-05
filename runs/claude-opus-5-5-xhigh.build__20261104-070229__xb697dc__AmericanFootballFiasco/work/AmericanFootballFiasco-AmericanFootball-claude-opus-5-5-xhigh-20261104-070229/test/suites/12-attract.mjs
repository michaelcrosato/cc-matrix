import { load } from '../lib/context.mjs';
export default async ok => {
  const c = load(); const { game, FF, E } = c;
  game.advance(1);
  // ten idle seconds on the title start the attract mode
  game.advance(10.5);
  ok('10 s idle on the title starts the attract mode', game.sceneName === 'attract', game.sceneName);
  const before = JSON.stringify(E.store.get('ff:records', {}));
  // one whole loop
  const segs = FF.data.attract, seen = new Set();
  let t = 0; while (t < 160 && FF.attract.loops < 1) { game.advance(.25); t += .25; if (FF.attract.seg) seen.add(FF.attract.seg.id); }
  ok('the loop plays every segment', seen.size === segs.length, [...seen].join(','));
  for (const s of segs) ok('segment ' + s.id + ' shows ' + (s.expect || 'itself'), !s.expect || !!FF.attract.seen[s.id], JSON.stringify(FF.attract.seen));
  ok('no errors in the loop', !game.errors.length, game.errors.slice(0, 3).map(e => e.message + ' ' + String(e.stack).split('\n')[1]).join(' | '));
  ok('nothing is saved', JSON.stringify(E.store.get('ff:records', {})) === before);
  ok('no unknown-sound or song warnings', !c.warnings.some(w => /unknown sound|no such|unknown song/.test(w)), c.warnings.filter(w => /unknown/.test(w)).slice(0, 3).join(' | '));
  // any input leaves, back where it came from
  game.input.tap('b3'); game.advance(.1); game.advance(.6);
  ok('any input leaves the attract mode', game.sceneName === 'title', game.sceneName);
  // from the menu too
  game.go('menu', null, { fade: 0 }); game.advance(.2); game.advance(11.5);
  ok('10 s idle on the menu starts it', game.sceneName === 'attract', game.sceneName);
  game.input.feed('move', 50, 50); game.input.feed('move', 120, 120); game.advance(.8);
  ok('moving the mouse leaves it, back to the menu', game.sceneName === 'menu', game.sceneName);
};
