import { load } from '../lib/load.mjs';
export default async t => {
  const { G, game } = load(); game.advance(.5); const I = game.input;
  I.use(G.INPUT.MATCH);
  I.lastDevice = 'gamepad'; game.settings.set('glyphs', 'playstation'); t('PlayStation glyph for play', G.btn('play') === '✕', G.btn('play'));
  game.settings.set('glyphs', 'xbox'); t('Xbox glyph after the setting', G.btn('play') === 'A', G.btn('play'));
  I.lastDevice = 'keyboard'; t('keycaps on a keyboard', G.btn('play') === 'Space', G.btn('play'));
  I.lastDevice = 'mouse'; t('mouse button for the mouse', /click/i.test(G.btn('play')), G.btn('play'));
  game.settings.set('glyphs', 'playstation');
  t('Button symbols setting defaults to PlayStation', game.settings.spec('glyphs').value === 'playstation' && game.settings.spec('glyphs').group === 'Game');
  // focus: d-pad moves, hover focuses, click activates
  G.go('menu', null, { fade: 0 }); game.advance(.2); const m = G.SCENES.menu;
  I.tap('down'); game.advance(.05); t('the d-pad moves the focus', m.focus.i === 1, m.focus.i);
  const L = m.layout(), it = L[3]; I.feed('move', it.x + 5, it.y + 5); game.advance(.05); t('hover moves the focus', m.focus.i === 3, m.focus.i);
  I.feed('down', it.x + 5, it.y + 5); game.advance(1 / 120); I.feed('up', it.x + 5, it.y + 5); game.advance(.4); t('a click activates', game.sceneName === G.SCENES.menu.items()[3].id || game.sceneName !== 'menu', game.sceneName);
  t('pause actions list Dev Mode', G.pauseItems().filter(Boolean).some(a => a[0] === 'Dev Mode') && G.pauseItems().filter(Boolean).some(a => a[0] === 'How to Play'));
  t('no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
};
