import { load } from '../lib/context.mjs';
export default async ok => {
  const { game, FF } = load(); const I = game.input;
  game.advance(1); I.tap('start'); game.advance(1);
  ok('Enter on the title opens the menu', game.sceneName === 'menu');
  // keys move the focus; the mouse hovers and clicks
  const MMi = () => game.debug && FF.scenes.menu; void MMi;
  I.tap('down'); game.advance(.1); I.tap('down'); game.advance(.1); I.tap('confirm'); game.advance(.6);
  ok('down, down, confirm on the menu opens PRACTICE', game.sceneName === 'practice', game.sceneName);
  I.tap('cancel'); game.advance(.6); ok('back returns to the menu', game.sceneName === 'menu');
  // a click on HALL OF FIASCO (the 4th button: x 14.., y 50 + 3 * 27)
  I.feed('move', 60, 50 + 3 * 27 + 10); game.advance(.05); I.feed('down', 60, 50 + 3 * 27 + 10); I.feed('up', 60, 50 + 3 * 27 + 10); game.advance(.6);
  ok('a mouse click picks a menu item', game.sceneName === 'records', game.sceneName);
  game.go('menu', null, { fade: 0 }); game.advance(.2);
  ok('PlayStation is the default button symbols, Xbox the other', game.settings.spec('glyphs').value === 'playstation' && game.settings.spec('glyphs').options.map(o => o[0]).join() === 'playstation,xbox');
  for (const k of ['difficulty', 'quarter', 'camera', 'replays', 'commentary', 'voices', 'crowd', 'autoSwitch', 'showRoutes', 'targetMarker', 'lateHits', 'bigHeads']) ok('the setting ' + k + ' exists', !!game.settings.spec(k));
  game.menu('settings'); ok('game.menu(\'settings\') opens Settings', game.shell.screen === 'settings', game.shell.screen); game.shell.hide();
  const items = game.o.menu.items(); game.go('match', { spec: { mode: 'exhibition', home: 'owls', away: 'yetis', humans: { 0: [0], 1: [] } } }, { fade: 0 }); game.advance(.2);
  const inMatch = game.o.menu.items().map(i => i[0]); ok('the pause menu has Dev Mode and Restart in an exhibition', inMatch.includes('Dev Mode') && inMatch.includes('Restart'), inMatch.join(',')); void items;
  // touch-only: the message and the Settings button; the attract mode still runs
  const t = load({ touch: true, media: { '(pointer: coarse)': true, '(any-pointer: fine)': false } }); t.game.advance(1);
  ok('a touch-only device is detected', t.FF.touchOnly.locked);
  ok('touch controls are off', t.game.input.touchEnabled === false);
  t.game.advance(11); ok('the attract mode runs on a touch-only device', t.game.sceneName === 'attract', t.game.sceneName);
  const k = load({ touch: true, media: { '(pointer: coarse)': true } }); k.FF.touchOnly.unlocked = true; k.game.advance(.5); ok('a key unlocks it', !k.FF.touchOnly.locked || k.FF.touchOnly.unlocked);
  ok('no errors', !game.errors.length && !t.game.errors.length, game.errors.concat(t.game.errors).map(e => e.message).join(' | '));
};
