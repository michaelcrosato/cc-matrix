import { loadGame } from './lib/load.mjs';
export default async t => {
  const G = loadGame(), { KC, game, I } = G; G.adv(.3);
  game.go('title', {}, { fade: 0 }); G.adv(.2); I.tap('start'); G.adv(.2); const S = game.scene;
  t.check('start opens the main menu', S.mode === 'menu');
  const ids = S.menu.items.filter(i => !i.hidden).map(i => i.id); t.check('main menu items', ['road', 'versus', 'dojo', 'bonus', 'records', 'options', 'about'].every(x => ids.includes(x)), ids);
  const i0 = S.menu.i; I.tap('down'); G.adv(.1); t.check('down moves the focus', S.menu.i !== i0);
  // the mouse: hover moves the focus, a click picks (the menu's rects come from its last draw: fake one)
  S.menu.rects = S.menu.items.map((it, k) => [100, 80 + k * 24, 200, 24]); I.feed('move', 150, 80 + 2 * 24 + 5); G.adv(.05); t.check('hover moves the focus', S.menu.i === 2, S.menu.i);
  I.feed('down', 150, 80 + 2 * 24 + 5); I.feed('up', 150, 80 + 2 * 24 + 5); G.adv(.3); t.check('a click picks (VERSUS)', game.sceneName === 'versus', game.sceneName);
  // prompts follow the last device
  I.lastDevice = 'gamepad'; t.check('pad prompts: PlayStation cross', KC.ok() === 'pad0' && KC.padFamily() === 'playstation'); I.lastDevice = 'keyboard'; t.check('keyboard prompts: keycaps', KC.ok() === 'key:ENTER'); I.lastDevice = 'mouse'; t.check('mouse prompts: mouse buttons', KC.ok() === 'mouse:0');
  // the touch-only gate
  { const T = loadGame({ matchMedia: () => ({ matches: false }), navigator: { maxTouchPoints: 5, getGamepads: () => [] } }); T.adv(.5); T.game.go('title', {}, { fade: 0 }); T.adv(.2);
    t.check('touch-only: the gate shows', T.KC.touchOnly()); t.check('touch-only: no touch controls', T.game.input.touchEnabled === false);
    T.adv(10.5); t.check('touch-only: the attract mode still runs', T.KC.Attract.on, T.game.sceneName); }
  // About: every TASK field filled, paged
  const pages = KC.aboutPages(); t.check('About: 5 sections paged, 8 lines a page at most', pages.length >= 5 && pages.every(p => p.lines.length <= 8), pages.length);
  const si = KC.ABOUT.sourceInformation; t.check('About: all 15 Source Information fields', ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'].every(k => si[k] && String(si[k]).length));
  t.check('About: 4 + 6 + 4 feedback answers', KC.ABOUT.testingFeedback.length === 4 && KC.ABOUT.engineFeedback.length === 6 && KC.ABOUT.promptFeedback.length === 4);
  // options: the game's own settings beside the engine's
  for (const k of ['difficulty', 'calls', 'hints', 'camera', 'techNames', 'inputDisplay', 'palette', 'voices', 'glyphs']) t.check('setting ' + k, game.settings.spec(k) !== undefined);
  game.settings.set('calls', 'Japanese'); t.check('Japanese referee calls', KC.calls('begin') === 'HAJIME!'); game.settings.set('calls', 'English');
  // the move list: postures cycle, R previews
  KC.MoveList.open('title'); G.adv(.3); t.check('the move list opens', game.sceneName === 'movelist' && KC.MoveList.active); I.tap('down'); G.adv(.05); I.tap('tUp'); G.adv(.05); t.check('L picks a posture, R previews a technique', KC.MoveList.row === 1 && KC.MoveList.sel === 'upLunge', [KC.MoveList.row, KC.MoveList.sel]);
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
};
