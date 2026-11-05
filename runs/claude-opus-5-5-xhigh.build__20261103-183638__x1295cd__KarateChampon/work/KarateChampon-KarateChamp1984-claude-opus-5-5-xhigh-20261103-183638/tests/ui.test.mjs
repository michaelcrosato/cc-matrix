// ui: menus by keys, pad and the mouse (hover moves the focus, a click picks); prompts follow the device; PlayStation by
// default, Xbox on request, Restore defaults back to PlayStation; the About pages hold every field; the move list
import { fresh, steps } from './lib/util.mjs';
export default async t => {
  const { KC, game } = fresh(), I = game.input;
  steps(game, 60); I.tap('start'); steps(game, 10); const m = game.scene.menu;
  I.tap('down'); steps(game, 2); t.check('down moves the focus', m.i === 1, m.i);
  // the mouse: hover a row, then click it (rows are known once drawn: give them by hand headless)
  m._rows = m.items.map((it, i) => ({ x: 100, y: 80 + i * 24, w: 120, h: 24, i }));
  I.feed('move', 150, 80 + 3 * 24 + 5); steps(game, 2); t.check('hovering a row moves the focus', m.i === 3, m.i);
  I.feed('down', 150, 80 + 2 * 24 + 5); I.feed('up', 150, 80 + 2 * 24 + 5); steps(game, 3); t.check('a click picks the row (DOJO)', game.sceneName === 'dojo', game.sceneName);
  I.tap('cancel'); steps(game, 4); t.check('cancel goes back to the main menu', game.sceneName === 'title' && game.scene.menuOn, game.sceneName);
  // device-specific prompts
  I.lastDevice = 'gamepad'; t.check('a pad shows PlayStation glyphs by default', KC.actionIcon('confirm', I).kind === 'ps');
  game.settings.set('glyphs', 'xbox'); t.check('the Xbox option shows A B X Y', KC.actionIcon('confirm', I).kind === 'xb' && KC.actionIcon('cancel', I).b === 1);
  game.settings.reset('Controller'); t.check('restoring the default goes back to PlayStation', game.settings.glyphs === 'playstation');
  I.lastDevice = 'mouse'; t.check('the mouse shows mouse buttons for confirm and back', KC.actionIcon('confirm', I).kind === 'mouse' && KC.actionIcon('cancel', I).b === 2);
  I.lastDevice = 'keyboard'; t.check('the keyboard shows keycaps', KC.actionIcon('confirm', I).kind === 'key' && KC.actionIcon('confirm', I).label === 'ENTER', JSON.stringify(KC.actionIcon('confirm', I)));
  // About: every Source Information field filled, every feedback answer present, at most 4 entries a page
  const pages = KC.aboutPages(), S = KC.ABOUT.sourceInformation;
  for (const k of ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage']) t.check('About: ' + k + ' is filled', typeof S[k] === 'string' && S[k].trim().length > 0, S[k]);
  t.check('About: 4 testing, 6 engine and 4 prompt answers', KC.ABOUT.testingFeedback.length === 4 && KC.ABOUT.engineFeedback.length === 6 && KC.ABOUT.promptFeedback.length === 4 && [...KC.ABOUT.testingFeedback, ...KC.ABOUT.engineFeedback, ...KC.ABOUT.promptFeedback].every(a => a && a.length > 3));
  const LP = KC.AboutScene.linePages.call(Object.assign({}, KC.AboutScene, { pages, _lw: 0 }), 427), words = s2 => s2.replace(/\s+/g, ' ').trim(); t.check('About: pages of 12 lines at most, every answer whole across them', LP.every(p => p.lines.length <= 12) && pages.some(p => p.title === 'CREDITS') && KC.ABOUT.engineFeedback.every(a => words(LP.flatMap(p => p.lines.map(l => l[1])).join(' ')).includes(words(a).slice(-60))), LP.length + ' pages');
  // the move list: a panel over the scene; posture rows; a preview rig
  const ML = KC.MoveList.open(); t.check('the move list opens over the scene', KC.Overlay.active);
  I.tap('down'); steps(game, 2); t.check('down picks the next posture (step in)', ML.p === 1 && ML.tech() === 'upLunge', ML.p + ' ' + ML.tech());
  I.tap('tDown'); steps(game, 2); t.check('the right stick previews: step in + down is the front sweep', ML.tech() === 'frontSweep' && ML.preview.tech === 'frontSweep', ML.preview.tech);
  I.tap('cancel'); steps(game, 2); t.check('the move list closes', !KC.Overlay.active);
  // options are the engine's settings screen with the game's own
  for (const k of ['difficulty', 'calls', 'hints', 'camera', 'techNames', 'inputDisplay', 'palette', 'voices']) t.check('option ' + k + ' exists', game.settings.spec(k) !== undefined);
  game.settings.set('calls', 'Japanese'); t.check('Japanese calls: HAJIME!', KC.call('begin') === 'HAJIME!'); game.settings.set('calls', 'English');
  game.settings.set('palette', 'Classic'); t.check('the classic palette is locked until the road is finished', game.settings.palette === 'Modern');
};
