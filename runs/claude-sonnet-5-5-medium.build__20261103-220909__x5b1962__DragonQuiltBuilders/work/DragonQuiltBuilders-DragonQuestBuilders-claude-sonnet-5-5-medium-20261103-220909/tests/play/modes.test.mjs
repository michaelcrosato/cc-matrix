// Attract mode, the Quilting Bee, the title idle timer, the touch-only message, dev tools.
import { boot } from '../lib/helpers.mjs';
export default async function () {
  const H = boot(), { DQ, game, I, check, tick } = H;
  // title idles into attract after 10 seconds, any input leaves it
  game.go('title'); tick(1); check('title scene', game.sceneName === 'title');
  tick(8); check('no attract before 10s', game.sceneName === 'title');
  tick(3); check('attract starts after 10s idle', game.sceneName === 'attract', game.sceneName);
  const seen = new Set(); let boss = false, rooms = false, talk = false; for (let i = 0; i < 100; i++) { tick(1); seen.add(DQ.Attract.vi); if (DQ.S.boss) boss = true; if (DQ.S.town.rooms.some(r => r.type === 'Bedroom')) rooms = true; if (DQ.talk.open) talk = true; }
  check('attract cycles through vignettes', seen.size >= 4, [...seen].join());
  check('attract shows a boss, a room being built and a conversation', boss && rooms && talk, [boss, rooms, talk].join());
  check('attract keeps running (no errors)', game.errors.length === 0 && DQ.errors.length === 0, game.errors.map(e => e.message || e).concat(DQ.errors).join('|').slice(0, 400));
  I.tap('confirm'); tick(1.5); I.tap('confirm'); tick(.6); check('any input exits attract', game.sceneName === 'title', game.sceneName);
  tick(2); // timer restarts
  check('attract rearms', game.sceneName === 'title');
  // Quilting Bee solo
  game.go('play', { mode: 'bee' }); tick(.5); const S = DQ.S; check('bee starts', S.mode === 'bee' && S.bee.state === 'play');
  const h = S.hero; DQ.god = true; let n = 0;
  while (S.bee.state === 'play' && n++ < 400) { tick(.5); for (const m of S.monsters) if (m.hp > 0 && Math.hypot(m.x - h.x, m.y - h.y) < 250) { m.hp = 0; DQ.killMonster(m); } }
  check('bee ends by itself with a score', S.bee.state === 'done' && S.bee.final > 0, JSON.stringify(S.bee));
  tick(.5); check('bee results panel', DQ.ui.top() && DQ.ui.top().panel === 'results');
  DQ.god = false; I.tap('confirm'); tick(1); I.tap('confirm'); tick(.6);
  // dev tools
  game.go('play', { new: true, name: 'Dev' }); tick(.3); H.skipTalk(); DQ.openDev(); tick(.2); check('dev panel opens', DQ.ui.top() && DQ.ui.top().panel === 'dev');
  const p = DQ.ui.top(); const slider = p.rows.findIndex(r => r.slider && r.slider.key === 'monsterHp'); p.sel = slider; I.tap('right'); tick(.1); check('slider changes a tuning value', DQ.tuning.monsterHp > 1, DQ.tuning.monsterHp);
  const reset = p.rows.findIndex(r => r.label.startsWith('Reset')); p.sel = reset; I.tap('confirm'); tick(.1); check('reset restores defaults', DQ.tuning.monsterHp === 1);
  DQ.ui.closeAll(); DQ.god = false;
  // Builder's Eye: hold to freeze and aim a cell
  DQ.S.hero.facing = 0; const ph = DQ.S.hero; const px0 = ph.x; I.hold('eye'); tick(.1); const c0 = { ...DQ.eyeCell }; I.tap('down'); tick(.1);
  check("Builder's Eye shows a cursor that steps and holds the builder still", DQ.builderEyeActive && (DQ.eyeCell.cx !== c0.cx || DQ.eyeCell.cy !== c0.cy) && Math.abs(ph.x - px0) < 1, JSON.stringify([c0, DQ.eyeCell]));
  I.hold('eye', false); tick(.1); check('releasing ends it', !DQ.builderEyeActive);
  // settings glyph option feeds input
  game.settings.set && game.settings.set('glyphs', 'Xbox'); tick(.2); check('glyph setting reaches the input', game.input.glyphs === 'xbox', game.input.glyphs);
  game.settings.set && game.settings.set('glyphs', 'PlayStation'); tick(.2);
  check('no errors', game.errors.length === 0 && DQ.errors.length === 0, game.errors.map(e => e.message || e).concat(DQ.errors).join('|').slice(0, 500));
  return H;
}
