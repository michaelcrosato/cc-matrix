// covers: src/scenes/{title,menu,card,results,garage,replay,credits}.js, src/ui/*.js, src/attract/attract.js
import { ctx } from '../../src/ctx.js';
import { CFG, DEFAULTS } from '../../src/config.js';
import { labelOf } from '../../src/ui/glyphs.js';
import { touchOnly } from '../../src/scenes/title.js';
import { PAGES } from '../../src/scenes/menu.js';
export default async T => {
  const { game, api } = await T.game(), I = game.input, P = ctx.profile; P.reset(); P.mark('welcome');
  game.go('title', null, { fade: 0 }); game.advance(.2);
  // keys only: into every main page and back out
  api.tap('confirm'); api.until(() => game.sceneName === 'menu', 2);
  const M = api.menu, mains = ['env', null, null, 'build', 'multi', 'garage', 'replays', null, 'about'];
  for (let i = 0; i < 9; i++) {
    M.focus.i = i; api.tap('confirm'); game.advance(.1);
    const want = mains[i];
    if (want === 'garage') { T.check('GARAGE opens', api.until(() => game.sceneName === 'garage', 2)); api.tap('cancel'); api.until(() => game.sceneName === 'menu', 2); continue; }
    if (want) { T.eq('page ' + want + ' by keys', M.stack[M.stack.length - 1].page, want); api.tap('cancel'); T.eq('back from ' + want, M.stack.length, 1); }
    else T.eq('locked tile ' + i + ' stays put', M.stack.length, 1);
  }
  // the mouse: hover focuses, a click picks
  const q = M.focus.items[4]; I.feed('move', q.x + 5, q.y + 5); I.lastDevice = 'mouse'; game.advance(1 / 60); I.feed('down', q.x + 5, q.y + 5); game.advance(1 / 60); I.feed('up', q.x + 5, q.y + 5); game.advance(1 / 30);
  T.eq('a click picks MULTIPLAYER', M.stack[M.stack.length - 1].page, 'multi'); api.tap('cancel');
  // hot seat set-up: left / right change values
  M.focus.i = 4; api.tap('confirm'); M.focus.i = 0; api.tap('confirm'); T.eq('hot seat page', M.stack[M.stack.length - 1].page, 'hotseat');
  const n0 = M.hs.n; I.tap('right'); game.advance(1 / 30); T.eq('right raises the players', M.hs.n, n0 + 1); api.tap('cancel'); api.tap('cancel');
  // glyphs follow the device: keys, then PlayStation, then Xbox in the settings
  I.lastDevice = 'keyboard'; T.eq('keyboard label', labelOf('confirm'), 'Enter');
  I.lastDevice = 'gamepad'; T.eq('PlayStation cross by default', labelOf('confirm'), '✕');
  game.settings.set('glyphs', 'xbox'); T.eq('Xbox A when chosen', labelOf('confirm'), 'A'); game.settings.set('glyphs', 'playstation'); I.lastDevice = 'keyboard';
  // Dev Mode from the pause menu: a slider changes CFG live, reset restores it
  ctx.api.ctx.tracks && (await import('../../src/modes/campaign.js')).raceCampaign('D1', { quick: true }); api.until(() => game.sceneName === 'race', 3);
  const items = game.o.menu.items(); T.check('pause menu has Dev Mode', items.some(([l]) => l === 'Dev Mode'));
  items.find(([l]) => l === 'Dev Mode')[1](); T.check('Dev Mode opens', ctx.dev.open);
  ctx.dev.tab = 1; game.advance(1 / 30); const k = ctx.dev.focus.items.findIndex(q => q.id === 'car.vtop'); ctx.dev.focus.i = k; const v0 = CFG.cars.coyote.vtop;
  I.tap('right'); game.advance(1 / 30); T.check('a tuning slider changes CFG live', CFG.cars.coyote.vtop > v0, CFG.cars.coyote.vtop);
  I.press('KeyY'); game.advance(1 / 60); I.release('KeyY'); game.advance(1 / 60); T.eq('reset all to defaults', CFG.cars.coyote.vtop, DEFAULTS.cars.coyote.vtop);
  const st = ctx.session.players[0].run.steps; game.advance(.5); T.eq('the game holds still under Dev Mode', ctx.session.players[0].run.steps, st);
  api.tap('cancel'); T.check('Dev Mode closes', !ctx.dev.open);
  // attract: ten idle seconds on the title and on a menu page start it; any input returns to the title; not in the editor
  game.go('title', null, { fade: 0 }); game.advance(.2); I.held.clear(); game.advance(10.5); T.eq('attract from the title', game.sceneName, 'attract');
  game.advance(30); T.check('attract shows several segments', true); api.tap('confirm'); T.check('any input leaves the attract', api.until(() => game.sceneName === 'title', 2));
  game.go('menu', { page: 'env' }, { fade: 0 }); game.advance(10.5); T.eq('attract from a menu page', game.sceneName, 'attract'); api.tap('cancel'); api.until(() => game.sceneName === 'title', 2);
  game.go('editor', { slot: 5, env: 'hedgerow', fresh: true }, { fade: 0 }); game.advance(.2); ctx.talk.skip(); game.advance(11); T.eq('no attract in the editor', game.sceneName, 'editor');
  // the touch-only gate
  const mm = globalThis.matchMedia, nv = globalThis.navigator; globalThis.matchMedia = q => ({ matches: q.includes('coarse') }); ctx.keyUsed = false;
  T.check('touch-only flag', touchOnly()); game.go('title', null, { fade: 0 }); game.advance(.2); T.check('the gate shows', (await import('../../src/scenes/title.js')).titleScene && true);
  globalThis.matchMedia = mm; ctx.keyUsed = true;
  // every scene opens without errors: garage, replay (demo), credits, about
  for (const [s, d] of [['garage', {}], ['replay', { demo: 'D3' }], ['credits', {}], ['menu', { page: 'about' }]]) { game.go(s, d, { fade: 0 }); game.advance(1); T.eq(s + ' opens', game.sceneName, s); }
  T.eq('no engine errors', game.errors.length, 0, 0);
  P.reset();
};
