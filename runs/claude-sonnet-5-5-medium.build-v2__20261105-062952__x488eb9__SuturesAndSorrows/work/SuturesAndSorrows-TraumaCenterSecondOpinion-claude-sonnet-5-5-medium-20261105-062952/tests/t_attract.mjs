export default async function ({ check, load }) {
  const ctx = load(); const G = ctx.GAME, game = G.game, I = game.input, name = () => game.scene && game.scene.__name;
  const adv = s => game.advance(s, { draw: false });
  adv(1); check('starts on title', name() === 'title'); adv(5); check('not before 10 s idle', name() === 'title'); adv(6); check('title idle 10 s starts attract', name() === 'attract', name());
  adv(20); check('attract plays without errors', !game.errors.length, game.errors.map(e => e.message).join('|'));
  I.tap('confirm'); adv(.6); check('input exits attract to title', name() === 'title', name());
  check('the exiting press does nothing else', name() === 'title');
  // loops: run the whole reel twice
  game.go('attract'); let segs = new Set(), guard = 0; const sc = game.scene; let last = -1, loops = 0; while (guard++ < 400 && loops < 2) { adv(1); if (name() !== 'attract') break; const sg = game.scene.seg; if (sg < last) loops++; last = sg; segs.add(sg); }
  check('attract reel loops twice with no errors', loops >= 2 && !game.errors.length, `loops ${loops} segs ${segs.size} ${game.errors.map(e => e.message).join('|')}`);
  game.go('menu'); adv(1); adv(11); check('menu idle starts attract', name() === 'attract'); I.tap('confirm'); adv(.6);
  game.go('about'); adv(1); adv(12); check('not on reading screens (about)', name() === 'about', name());
  game.go('menu'); adv(1); I.hold('fine', true); adv(11); I.hold('fine', false); check('a held input keeps the menu from idling out', name() === 'menu', name());
}
