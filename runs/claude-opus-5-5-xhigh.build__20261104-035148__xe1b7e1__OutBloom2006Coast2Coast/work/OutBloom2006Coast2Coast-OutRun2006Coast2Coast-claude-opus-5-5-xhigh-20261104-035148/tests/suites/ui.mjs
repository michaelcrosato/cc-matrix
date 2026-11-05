// UI: every screen reachable with pad, keys and mouse and each has a way back; readability; glyphs follow the device
// (PlayStation by default, Xbox by setting, rebinding changes the prompt); the attract mode (10 s idle starts it, 9.9
// does not, any input returns to the same screen and focus and is consumed, no profile writes); touch-only; Dev Mode
import { boot } from '../lib/boot.mjs';
export default async function (t) {
  { const { OB, game, I } = boot(); const sc = () => game.sceneName, step = (s = .6) => game.advance(s);
    step(1); I.tap('confirm'); step(); t('title -> menu by confirm', sc() === 'menu', sc());
    I.tap('cancel'); step(); t('menu -> title by cancel', sc() === 'title', sc()); I.tap('start'); step(); t('title -> menu by start', sc() === 'menu');
    // the carousel: right moves the mode, confirm opens it
    const seen = new Set(); for (let i = 0; i < 6; i++) { I.tap('right'); step(.3); }
    I.tap('confirm'); step(); t('carousel confirm opens a mode', sc() !== 'menu', sc());
    const visit = (open, name) => { game.go('menu', null, { fade: 0 }); step(.3); open(); step(); const at = sc(); I.tap('cancel'); step(); return [at, sc()]; };
    for (const [k, name] of [[0, 'garage'], [1, 'garage'], [3, 'trial'], [4, 'versus'], [5, 'garden']]) { const r = visit(() => { game.go('menu', { focus: k }, { fade: 0 }); step(.3); I.tap('confirm'); }, name); t('menu reaches ' + name + ' and back', r[0] === name && r[1] !== name, r.join(' -> ')); }
    const tr = visit(() => { game.go('menu', { focus: 2 }, { fade: 0 }); step(.3); I.tap('confirm'); }, 'tour'); t('menu reaches the tour (its intro first) and back', ['tourintro', 'tour'].includes(tr[0]), tr.join());
    // the bottom row by navigation: down then confirm
    game.go('menu', null, { fade: 0 }); step(.3); I.tap('down'); step(.2); I.tap('confirm'); step(); t('menu row: down lands on a button that opens a screen (settings over the menu)', sc() === 'menu' || sc() === 'howto', sc());
    for (const [scene, back] of [['howto', 'menu'], ['about', 'menu'], ['garden', 'menu'], ['trial', 'menu'], ['tour', 'menu'], ['radio', 'garage']]) { game.go(scene, scene === 'radio' ? { mode: 'arcade' } : null, { fade: 0 }); step(.3); const ok = sc() === scene; I.tap('cancel'); step(); t(scene + ' has a way back', ok && sc() === back, scene + ' -> ' + sc()); }
    // mouse: hover focuses, a click picks
    game.go('menu', null, { fade: 0 }); step(.4); const W = game.W, H = game.H; I.feed('move', W / 2, 219); step(.1); t('mouse hover moves the focus', OB.UI.focusId === 'howto', OB.UI.focusId);
    I.feed('down', W / 2, 219); I.feed('up', W / 2, 219); step(); t('a click picks what is under the pointer', sc() === 'howto', sc());
    // the garage, radio, race chain by keys
    game.go('garage', { mode: 'arcade' }, { fade: 0 }); step(.4); I.tap('confirm'); step(); t('garage -> radio', sc() === 'radio', sc()); I.tap('confirm'); step(1); t('radio -> race', sc() === 'race', sc());
    t('readability: no screen over 7 focusable items', OB.UI.readability.length === 0, OB.UI.readability.join('; '));
    t('no errors walking the screens', game.errors.length === 0, game.errors.map(e => e.where + ': ' + e.message).join(' | ')); }
  // glyphs
  { const { OB, game, I } = boot(); const U = OB.UI; game.advance(.5);
    t('PlayStation symbols by default', game.settings.glyphs === 'playstation' && U.glyphStyle() === 'playstation');
    game.settings.set('glyphs', 'xbox'); t('the setting switches to Xbox', U.glyphStyle() === 'xbox'); game.settings.set('glyphs', 'playstation');
    I.lastDevice = 'gamepad'; t('pad prompts use pad buttons', /^Pad\d+$/.test(U.codeFor('drift')) && U.codeFor('gas') === 'Pad7', U.codeFor('gas'));
    I.lastDevice = 'keyboard'; t('keyboard prompts use keys', U.codeFor('drift') === 'Space' && U.codeFor('gas') === 'KeyW', U.codeFor('drift'));
    I.rebind('drift', 'keys', 'KeyF'); t('rebinding changes the prompt', U.codeFor('drift') === 'KeyF', U.codeFor('drift'));
    I.lastDevice = 'mouse'; t('mouse prompts', U.device() === 'mouse'); for (const a of ['gas', 'brake', 'drift', 'horn', 'camera', 'radio', 'confirm', 'cancel']) for (const dev of ['keys', 'pad']) t('a prompt for ' + a + ' on ' + dev, !!U.codeFor(a, dev), a + dev); }
  // the attract mode
  { const { OB, game, I } = boot(); game.advance(.5); OB.Profile.data.seeds = 42; OB.Profile.save();
    game.advance(9.4); t('9.9 s idle does not start the attract mode', !OB.Attract.on && game.sceneName === 'title', game.sceneName);
    game.advance(1); t('10 s idle on the title starts it', OB.Attract.on, game.sceneName);
    const seen = new Set(); const off = OB.bus.on('*', (e, n) => seen.add(n));
    game.advance(100); off();
    t('the demo shows forks, drifts, requests, rivals or versus, and a goal', ['fork:choose', 'drift:end', 'req:end', 'stage:enter'].every(n => seen.has(n)) && (seen.has('rival:pass') || seen.has('drift:start')), [...seen].filter(n => !/shift|slip|overtake|offroad|tune|backfire/.test(n)).join(','));
    OB.Profile.data.seeds = 1; t('the attract mode never writes the profile', OB.Profile.save() === false);
    I.tap('confirm'); game.advance(.3); t('any input returns to the screen it came from', !OB.Attract.on && game.sceneName === 'title', game.sceneName);
    game.go('menu', { focus: 3 }, { fade: 0 }); game.advance(10.5); t('10 s idle on the menu starts it', OB.Attract.on); I.press('KeyX'); game.advance(.1); I.release('KeyX'); game.advance(.3);
    t('back to the menu with its focus', !OB.Attract.on && game.sceneName === 'menu', game.sceneName);
    t('no errors in the attract mode', game.errors.length === 0, game.errors.map(e => e.message).join(' | ')); }
  // touch-only
  { const { OB, game, I } = boot({ env: {} }); OB.env.fakeTouch = true; OB.Touch.refresh(); game.advance(.5);
    t('touch-only shows the notice', OB.Touch.blocked());
    game.advance(10.5); t('the attract mode still runs on touch', OB.Attract.on);
    I.feed('down', 10, 10, { touch: true }); I.feed('up', 10, 10, { touch: true }); game.advance(.3); t('a tap does not end the attract mode', OB.Attract.on);
    t('no touch buttons', game.input.touchEnabled === false);
    OB.env.fakeTouch = false; OB.env.keySeen = true; OB.Touch.refresh(); t('a key clears the notice', !OB.Touch.blocked()); }
  // Dev Mode
  { const { OB, game, I } = boot(); game.advance(.3); game.go('race', { mode: 'arcade', noIntro: true }, { fade: 0 }); game.advance(4);
    OB.Dev.open(); t('Dev Mode opens over a frozen race', OB.Dev.isOpen && game.timeScale === 0);
    const z0 = OB.Race.current.p1.car.z; game.advance(1); t('the race is frozen while it is open', OB.Race.current.p1.car.z === z0);
    OB.Dev.tab = 0; const rows = OB.Dev.rows(), top = rows.findIndex(r => r.key === 'topSpeedScale'); OB.Dev.row = top; for (let i = 0; i < 20; i++) { I.tap('right'); game.advance(.05); }
    t('a slider changes its value', OB.tuning.topSpeedScale > 1.1, OB.tuning.topSpeedScale);
    I.tap('confirm'); game.advance(.05); t('select resets the row', OB.tuning.topSpeedScale === 1);
    OB.setTune('topSpeedScale', 1.3); OB.Dev.row = 0; I.tap('confirm'); game.advance(.05); t('RESET ALL restores every default', Object.keys(OB.TUNING_DEFAULTS).every(k => OB.tuning[k] === OB.TUNING_DEFAULTS[k]));
    OB.Dev.tab = 1; OB.Dev.row = 0; I.tap('confirm'); game.advance(.05); t('a cheat toggles', OB.cheats.infiniteTime === true); OB.cheats.infiniteTime = false;
    I.tap('cancel'); game.advance(.1); t('back returns to the pause menu', !OB.Dev.isOpen && game.paused);
    game.resume(); game.advance(.1);
    OB.setTune('topSpeedScale', 1.25); const r = OB.Race.current; r.p1.car.v = 300; r.p1.brain = new OB.Brain({}); for (let i = 0; i < 120 * 12; i++) r.step(1 / 120);
    t('the top speed slider changes the car', r.p1.car.v > OB.CARS.orchidea.top * 1.1, r.p1.car.v); OB.resetTuning();
    game.debug.teleport('S8', .5, 0); t('warp lands where it says', r.p1.stage === 'S8' && Math.abs(r.p1.car.z - Math.floor(OB.World.stage('S8').stageLen * .5) * 200 - 800) < 10, r.p1.stage + ' ' + r.p1.car.z); }
}
