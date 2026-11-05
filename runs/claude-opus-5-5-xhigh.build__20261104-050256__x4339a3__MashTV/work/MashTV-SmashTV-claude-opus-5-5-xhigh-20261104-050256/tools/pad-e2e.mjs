// node tools/pad-e2e.mjs: a fake standard-mapping DualSense in Chromium (navigator.getGamepads stubbed), driven like a player
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { OUT } from './build.mjs';
export const PAD_STUB = () => {
  const btn = () => ({ pressed: false, touched: false, value: 0 });
  const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), vibrationActuator: null };
  window.__pad = pad; window.__padOn = false;
  navigator.getGamepads = () => [window.__padOn ? (pad.timestamp = performance.now(), pad) : null, null, null, null];
};
export async function padPress(p, i, ms = 120) { await p.evaluate(i => { window.__padOn = true; Object.assign(window.__pad.buttons[i], { pressed: true, value: 1 }); }, i); await p.waitForTimeout(ms); await p.evaluate(i => Object.assign(window.__pad.buttons[i], { pressed: false, value: 0 }), i); await p.waitForTimeout(ms); }
export async function padAxes(p, axes) { await p.evaluate(a => { window.__padOn = true; window.__pad.axes = a; }, axes); }
export async function run(check) {
  const url = pathToFileURL(new URL('../../' + OUT + '.html', import.meta.url).pathname).href;
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(PAD_STUB);
    const p = await ctx.newPage(), ev = f => p.evaluate(f);
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(url + '?pad=1'); await p.waitForTimeout(1500);
    const s0 = await ev(() => MT.game.sceneName);
    await padPress(p, 9);   // Options
    const after = await ev(() => ({ scene: MT.game.sceneName, dev: MT.game.input.lastDevice, confirm: MT.glyph.describe('confirm', MT.game.input), cancel: MT.glyph.describe('cancel', MT.game.input) }));
    check('pad: Options leaves the title screen and marks the controller as the last device', s0 === 'title' && after.dev === 'gamepad', [s0, after]);
    check('pad: prompts show PlayStation glyphs (confirm ✕, back ○)', after.confirm === '✕' && after.cancel === '○', after);
    await ev(() => MT.game.settings.set('glyphs', 'xbox'));
    const xb = await ev(() => [MT.glyph.describe('confirm', MT.game.input), MT.glyph.describe('cancel', MT.game.input)]);
    check('pad: the Xbox setting shows A / B on the menus', xb.join() === 'A,B', xb);
    await ev(() => MT.game.settings.set('glyphs', 'playstation'));
    await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200);
    const kb = await ev(() => ({ dev: MT.game.input.lastDevice, confirm: MT.glyph.describe('confirm', MT.game.input), }));
    check('pad: a key press switches the prompts to keys', kb.dev === 'keyboard' && kb.confirm === 'ENTER', kb);
    const i0 = await ev(() => MT.game.scene.st && MT.game.scene.st.i);
    await padAxes(p, [0, 1, 0, 0]); await p.waitForTimeout(150); await padAxes(p, [0, 0, 0, 0]); await p.waitForTimeout(200);
    const i1 = await ev(() => ({ i: MT.game.scene.st && MT.game.scene.st.i, dev: MT.game.input.lastDevice, confirm: MT.glyph.describe('confirm', MT.game.input) }));
    check('pad: the left stick moves the menu focus, and the prompts follow it back to ✕', i1.i === i0 + 1 && i1.dev === 'gamepad' && i1.confirm === '✕', [i0, i1]);
    for (let k = 0; k < 6 && await ev(() => MT.game.scene.st.i) !== 0; k++) { await padAxes(p, [0, -1, 0, 0]); await p.waitForTimeout(150); await padAxes(p, [0, 0, 0, 0]); await p.waitForTimeout(200); }
    await padPress(p, 0); await p.waitForTimeout(500);
    const diff = await ev(() => MT.game.sceneName);
    await padPress(p, 0); await p.waitForTimeout(600);
    const lobby = await ev(() => MT.game.sceneName);
    check('pad: ✕ picks PLAY, then a difficulty, into the lobby', diff === 'difficulty' && lobby === 'lobby', [diff, lobby]);
    await padPress(p, 1); await p.waitForTimeout(500);
    check('pad: ○ goes back', await ev(() => MT.game.sceneName) !== 'lobby', await ev(() => MT.game.sceneName));
    // play: the left stick moves, the right stick aims and fires, Options pauses
    await p.goto(url + '?pad=2#room=1-1&god=1'); await p.waitForTimeout(3000);
    await ev(() => { window.__padOn = true; });
    const x0 = await ev(() => MT.run.contestants[0].x);
    await padAxes(p, [1, 0, 0, 0]); await p.waitForTimeout(500); await padAxes(p, [0, 0, 0, 0]); await p.waitForTimeout(100);
    const x1 = await ev(() => MT.run.contestants[0].x);
    check('pad: the left stick moves the contestant (right)', x1 - x0 > 20, [x0, x1]);
    await padAxes(p, [0, 0, 0, 1]); await p.waitForTimeout(400);
    const aim = await ev(() => { const c = MT.run.contestants[0]; return { aim: c.aim, firing: c.firing, dev: MT.game.input.lastDevice }; });
    await padAxes(p, [0, 0, 0, 0]); await p.waitForTimeout(100);
    check('pad: the right stick aims (down) and fires', Math.abs(aim.aim - Math.PI / 2) < .6 && aim.firing && aim.dev === 'gamepad', aim);
    const hud = await ev(() => MT.glyph.describe('slide', MT.game.input) + '/' + MT.glyph.describe('bomb', MT.game.input) + '/' + MT.glyph.describe('showboat', MT.game.input));
    await ev(() => MT.game.settings.set('glyphs', 'xbox'));
    const hudX = await ev(() => MT.glyph.describe('bomb', MT.game.input) + '/' + MT.glyph.describe('showboat', MT.game.input));
    await ev(() => MT.game.settings.set('glyphs', 'playstation'));
    check('pad: in play the prompts show pad buttons (slide, Showstopper, showboat), RB / LB under Xbox', hud === 'L2/R1/L1' && hudX === 'RB/LB', [hud, hudX]);
    await padPress(p, 9); await p.waitForTimeout(400);
    const paused = await ev(() => ({ paused: MT.game.paused, screen: MT.game.shell && MT.game.shell.screen }));
    check('pad: Options opens the pause menu', paused.paused && paused.screen === 'pause', paused);
    await padPress(p, 9); await p.waitForTimeout(400);
    check('pad: Options again resumes', await ev(() => !MT.game.paused), await ev(() => [MT.game.paused, MT.game.shell && MT.game.shell.screen]));
    // attract: 10 s idle, then a pad button exits
    await p.goto(url + '?pad=3'); await p.waitForTimeout(500); await ev(() => { window.__padOn = true; }); await p.waitForTimeout(11000);
    const att = await ev(() => MT.game.sceneName);
    await padPress(p, 0); await p.waitForTimeout(500);
    const out = await ev(() => MT.game.sceneName);
    check('pad: 10 s idle with a pad connected starts the attract mode, and ✕ exits it', att === 'attract' && out === 'title', [att, out]);
    await p.goto(url + '#attract'); await p.waitForTimeout(1500); await ev(() => { window.__padOn = true; });
    await padAxes(p, [.9, 0, 0, 0]); await p.waitForTimeout(300); await padAxes(p, [0, 0, 0, 0]); await p.waitForTimeout(300);
    check('pad: a stick push exits the attract mode too', await ev(() => MT.game.sceneName) === 'title', await ev(() => MT.game.sceneName));
    check('pad: no page errors', !errs.length, errs.slice(0, 3));
  } finally { await b.close(); }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) { let f = 0, n = 0; await run((name, ok, info) => { n++; if (!ok) { f++; console.log('FAIL', name, JSON.stringify(info)); } }); console.log(`pad e2e: ${n - f} passed, ${f} failed`); }
