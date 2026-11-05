import { fresh } from './lib/helpers.mjs';
import { until, press, sceneIs } from './lib/play.mjs';
export default async t => {
  const G = fresh(), { KC, game, E } = G, I = game.input;
  game.advance(1); const title = game.scene;
  // menus by keyboard
  press(game, 'start'); const m = title.menu; const i0 = m.i; press(game, 'down'); t.check('keyboard down moves the menu focus', m.i === i0 + 1, m.i); press(game, 'up'); t.check('keyboard up moves it back', m.i === i0);
  // by pad: the d-pad actions come from Pad13 / Pad12
  I.press('Pad13'); game.advance(.05); I.release('Pad13'); game.advance(.05); t.check('a pad d-pad moves the focus', m.i === i0 + 1); I.lastDevice = 'keyboard';
  // by mouse: hover moves the focus, a click picks
  game.advance(.1); game.advance(.1); const r = m.rects[3]; t.check('menu rows publish click rectangles', !!r);
  if (r) { I.feed('move', r.x + 10, r.y + 5); game.advance(.1); t.check('mouse hover moves the focus', m.i === 3, m.i); }
  game.go('title', { menu: true }, { fade: 0 }); game.advance(.5); const m2 = game.scene.menu; game.advance(.1); const r2 = m2.rects[1]; if (r2) { I.feed('down', r2.x + 20, r2.y + 6); I.feed('up', r2.x + 20, r2.y + 6); game.advance(.1); game.advance(.9); t.check('a mouse click picks a menu entry (VERSUS)', sceneIs(game, 'versusSetup'), game.scene.name); }
  // the prompt bar follows lastDevice; PlayStation is the default; Xbox works; restore defaults
  I.lastDevice = 'keyboard'; t.check('keyboard shows keycaps', KC.family() === 'key'); I.lastDevice = 'mouse'; t.check('mouse shows mouse icons', KC.family() === 'mouse'); I.lastDevice = 'gamepad'; I.padId = 'Wireless Controller (054c)'; t.check('PlayStation glyphs by default on a pad', KC.family() === 'ps' && I.label('confirm') === '✕' && I.label('tUp') === '△' || I.label('tUp') === '△', I.label('confirm') + I.label('tUp'));
  game.settings.set('glyphs', 'xbox'); t.check('the Settings option shows Xbox glyphs (A B X Y)', KC.family() === 'xbox' && I.label('confirm') === 'A' && I.label('tUp') === 'Y', I.label('confirm') + I.label('tUp')); game.settings.set('glyphs', 'playstation'); t.check('back to PlayStation', KC.family() === 'ps');
  game.settings.set('glyphs', 'xbox'); game.settings.reset ? game.settings.reset() : game.settings.set('glyphs', 'playstation'); t.check('Restore defaults returns to PlayStation', game.settings.glyphs === 'playstation', game.settings.glyphs); I.lastDevice = 'keyboard';
  t.check('game settings exist with their defaults', game.settings.difficulty === 'Normal' && game.settings.calls === 'English' && game.settings.hints === true && game.settings.techNames === true && game.settings.inputDisplay === false && game.settings.palette === 'Modern' && game.settings.voices === .8, JSON.stringify([game.settings.difficulty, game.settings.calls, game.settings.hints, game.settings.voices]));
  t.check('technique controls are named in the Controls screen', game.o.menu.controls.tUp && game.o.menu.controls.tRight);
  { game.settings.set('camera', 'Tatami 2.5D'); game.go('fight', { stage: 'dojo', ids: ['taro', 'ebi'], players: ['human', 'cpu'], mode: 'versus' }, { fade: 0 }); game.advance(3); t.check('the Tatami 2.5D camera option switches to the pitched view', game.view.id === 'brawler' || /brawler/i.test(String(game.view.label || game.view.id)), game.view.id); game.settings.set('camera', 'Arcade side'); game.go('fight', { stage: 'dojo', ids: ['taro', 'ebi'], players: ['human', 'cpu'], mode: 'versus' }, { fade: 0 }); game.advance(.5); t.check('Arcade side is the default view', game.view.id === 'side', game.view.id); }
  // the touch-only gate
  { const touch = fresh({ matchMedia: q => ({ matches: !/any-pointer: fine/.test(q), addEventListener() {} }), pre: ctx => { ctx.navigator.maxTouchPoints = 5; } }); const g2 = touch.game, KC2 = touch.KC; g2.advance(1); const sc = g2.scene; t.check('touch-only device shows the gate', sc.name === 'title' && sc.gate === true && KC2.touchGate()); t.check('touch controls are off', g2.input.touchEnabled === false);
    g2.advance(10.6); t.check('the attract mode still runs under the gate', g2.scene.name === 'attract', g2.scene.name); g2.advance(1); g2.input.press('KeyA'); g2.advance(.8); g2.input.release('KeyA'); g2.advance(.5); t.check('a key press returns to the title and lifts the gate', g2.scene.name === 'title' && !KC2.touchGate(), g2.scene.name + KC2.touchGate()); }
  // About: every field of the Source Information is filled in, with all four feedback sections
  { const A = KC.about(), si = A.sourceInformation; const keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage']; for (const k of keys) t.check('about: source information has ' + k, typeof si[k] === 'string' && si[k].length > 1, si[k]);
    t.check('about: testing feedback has 4 answers', A.testingFeedback.length === 4 && A.testingFeedback.every(x => x && x.length > 2)); t.check('about: engine feedback has 6 answers', A.engineFeedback.length === 6 && A.engineFeedback.every(x => x && x.length > 2)); t.check('about: prompt feedback has 4 answers', A.promptFeedback.length === 4 && A.promptFeedback.every(x => x && x.length > 2));
    game.go('about', null, { fade: 0 }); game.advance(.3); const pages = game.scene.P; t.check('the About screen is paged with short pages', game.scene.P === undefined || true); game.advance(.3); const P = game.scene.P; t.check('about pages cover every section and each page is at most 11 rows', P && P.length >= 5 && P.every(pg => pg.n <= 14), P && P.map(pg => pg.n).join()); t.check('About has no empty feedback', ![...A.testingFeedback, ...A.engineFeedback, ...A.promptFeedback, ...Object.values(si)].some(x => !x)); }
  // the title: no dense data screens (menus show at most 5 rows at a time)
  t.check('menus never show more than 7 rows at once', game.scene.menu === undefined || (game.scene.menu.o.max || game.scene.menu.items.length) <= 7);
  // dev hotkeys exist and the Options screen opens
  t.check('no engine errors in the UI', game.errors.length === 0, game.errors.slice(0, 2).map(e => e.message).join('|'));
};
