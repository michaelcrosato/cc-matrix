import { load } from '../lib/load.mjs';
export default function (t) {
  const { game, G } = load({});
  game.advance(.3); const I = game.input;
  game.go('menu', null, { fade: 0 }); game.advance(.1); const M = game.scene;
  const its = () => M.items(), f0 = M.nav.focus;
  I.tap('down'); game.advance(.05); t.ok('focus moves down spatially', M.nav.focus !== f0 && its().findIndex(i => i.id === M.nav.focus) === 1, M.nav.focus);
  I.tap('up'); game.advance(.05); t.ok('and back up', M.nav.focus === f0);
  const target = its()[3]; I.lastDevice = 'mouse'; I.feed('move', target.x + 5, target.y + 5); game.advance(.05); t.ok('hover moves the focus', M.nav.focus === target.id, M.nav.focus);
  const h = its().find(i => i.id === 'howto'); I.feed('down', h.x + 4, h.y + 4); game.advance(1 / 120); I.feed('up', h.x + 4, h.y + 4); game.advance(.3);
  t.ok('a click activates', game.sceneName === 'howto', game.sceneName);
  I.feed('down', 50, 50, { button: 2 }); game.advance(1 / 120); I.feed('up', 50, 50, { button: 2 }); game.advance(.4); t.ok('a right click goes back', game.sceneName === 'menu', game.sceneName);
  // prompts follow the device and the glyph setting
  I.lastDevice = 'gamepad'; game.settings.set('glyphs', 'playstation'); G.useInput('MENU'); t.ok('PlayStation glyphs on a pad', G.btnName('confirm') === '✕' && G.dev() === 'ps');
  game.settings.set('glyphs', 'xbox'); G.useInput('MENU'); t.ok('Xbox glyphs when chosen', G.btnName('confirm') === 'A' && G.dev() === 'xbox');
  I.lastDevice = 'keyboard'; t.ok('keycaps on a keyboard', G.btnName('confirm') === 'Enter' && G.dev() === 'kbm');
  I.lastDevice = 'mouse'; G.useInput('MATCH'); t.ok('the mouse button for a mouse player', G.btnName('play') === 'Left click');
  game.settings.set('glyphs', 'playstation');
  t.ok('the Button symbols setting defaults to PlayStation', game.settings.spec ? game.settings.spec('glyphs').value === 'playstation' : true);
  // the touch-only gate
  const tt = load({ touchOnly: true }); tt.game.advance(.5); t.ok('touch-only devices get the notice', tt.G.touchOnly() && tt.G.TOUCH_ONLY_AT_BOOT && tt.game.input.noTouch);
  tt.G.sawKeyOrPad = true; t.ok('a key or pad ends it', !tt.G.touchOnly());
  t.ok('no errors', !game.errors.length && !tt.game.errors.length, game.errors.concat(tt.game.errors).slice(0, 2).map(e => e.message).join('|'));
}
