// browser (Playwright, headless Chromium, the bundle from file://): it loads with no page errors and a 3D backend; a
// race renders a full picture; the keyboard thrusts; a stubbed DualSense (standard mapping) thrusts on ✕ and gives an
// analog half airbrake on L2, with PlayStation prompts (Xbox when set); the mouse hovers and clicks a tile; a touch-only
// phone gets the notice, a SETTINGS button and no touch controls, and the attract still runs; split screen draws two
// different pictures. Screenshots for the look go to tests/out/.
import { chromium } from 'playwright';
import { build, OUT } from '../../tools/bundle.mjs';
import { readPNG, stats } from '../lib/png.mjs';
const OUTDIR = new URL('../out/', import.meta.url).pathname;
export async function run(T) {
  build();
  const browser = await chromium.launch();
  const page = async (o = {}) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o.ctx || {}));
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    if (o.init) await p.addInitScript(o.init);
    await p.goto(OUT.href + (o.q || ''));
    return { p, errs, ctx };
  };
  const waitScene = async (p, name, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await p.evaluate(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName).catch(() => null); if (s === name) return true; await p.waitForTimeout(250); } return false; };
  const ev = (p, f, a) => p.evaluate(f, a);
  // waits in game time (a software-rendered page runs slower than the clock on the wall)
  const until = async (p, f, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(f).catch(() => false)) return true; await p.waitForTimeout(200); } return false; };
  const gameWait = async (p, s, ms = 90000) => { const g0 = await ev(p, () => My3D2dge.current.real); return until(p, `My3D2dge.current.real >= ${g0 + s}`, ms); };
  const racing = p => until(p, () => { const r = My3D2dge.current.debug.race(); return r && r.state === 'racing'; }, 90000);
  // load, render, keyboard
  {
    const t0 = Date.now(), { p, errs, ctx } = await page();
    const ok = await waitScene(p, 'title', 40000); T.check('the bundle boots to the title from file://', ok, (Date.now() - t0) + ' ms');
    T.check('the boot is under 20 s', Date.now() - t0 < 20000 || !ok, Date.now() - t0);
    T.check('a 3D backend', /WebGPU|WebGL 2/.test(await ev(p, () => My3D2dge.World3D && My3D2dge.World3D.backend)), await ev(p, () => My3D2dge.World3D && My3D2dge.World3D.backend));
    await p.waitForTimeout(1500); const t1 = readPNG(await p.screenshot({ path: OUTDIR + 'br-title.png' })), st1 = stats(t1);
    T.check('the title draws a full 3D picture', st1.lit > .6 && st1.colours > 40, st1);
    await ev(p, () => SN.flow.start({ mode: 'race', track: 'karakum', cls: 'FLARE', team: 'kestrel', pilot: 'vale', intro: false, seed: 4 }));
    await waitScene(p, 'race'); await racing(p);
    await p.keyboard.down('KeyW'); await gameWait(p, 2.5); const v = await ev(p, () => My3D2dge.current.debug.snapshot().player.kmh); await p.keyboard.up('KeyW');
    T.check('the keyboard thrusts (W)', v > 100, v);
    const img = readPNG(await p.screenshot({ path: OUTDIR + 'br-race.png' })), st = stats(img);
    T.check('a race renders (lit, many colours)', st.lit > .45 && st.colours > 60, st);
    T.check('no page errors', errs.length === 0 && (await ev(p, () => My3D2dge.current.errors.length)) === 0, errs.concat(await ev(p, () => My3D2dge.current.errors.map(e => e.message))));
    await ctx.close();
  }
  // a stubbed DualSense: ✕ thrusts, L2 at half gives half an airbrake, PlayStation prompts; Xbox when set
  {
    const init = () => { const btn = () => ({ pressed: false, value: 0 }); const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), timestamp: 0 }; window.__pad = pad; navigator.getGamepads = () => [pad]; };
    const { p, errs, ctx } = await page({ init });
    await waitScene(p, 'title', 40000);
    await ev(p, () => SN.flow.start({ mode: 'timetrial', track: 'solenne', cls: 'SPARK', team: 'soratek', pilot: 'mori', intro: false, seed: 2 }));
    await waitScene(p, 'race'); await racing(p);
    await ev(p, () => { __pad.buttons[0] = { pressed: true, value: 1 }; __pad.buttons[6] = { pressed: true, value: .5 }; });
    await gameWait(p, 2);
    const c = await ev(p, () => { const c = My3D2dge.current.debug.ctls()[0].out; return { thrust: c.thrust, brakeL: c.brakeL, kmh: My3D2dge.current.debug.snapshot().player.kmh, dev: My3D2dge.current.input.lastDevice, fire: My3D2dge.current.input.label('fire'), absorb: My3D2dge.current.input.label('absorb') }; });
    T.check('the DualSense ✕ thrusts', c.thrust === 1 && c.kmh > 60, c); T.check('L2 half pulled gives half an airbrake', Math.abs(c.brakeL - .5) < .02, c.brakeL);
    T.check('prompts follow the controller with PlayStation symbols', c.dev === 'gamepad' && c.fire === '□' && c.absorb === '○', c);
    await p.screenshot({ path: OUTDIR + 'br-pad-hud.png' });
    await ev(p, () => My3D2dge.current.settings.set('glyphs', 'xbox')); const x = await ev(p, () => My3D2dge.current.input.label('fire'));
    T.check('the Xbox setting shows X for fire', x === 'X', x);
    await ev(p, () => { __pad.buttons[0] = { pressed: false, value: 0 }; __pad.buttons[6] = { pressed: false, value: 0 }; My3D2dge.current.settings.set('glyphs', 'playstation'); });
    T.check('no page errors (pad)', errs.length === 0, errs);
    await ctx.close();
  }
  // the mouse: hover moves the focus, a click activates
  {
    const { p, errs, ctx } = await page(); await waitScene(p, 'title', 40000);
    await p.keyboard.press('Enter'); await waitScene(p, 'front'); await p.waitForTimeout(1200);
    const r = await ev(p, () => { const it = SN.UI.top().items[3]._r, sc = My3D2dge.current.screen, cv = document.getElementById('screen').getBoundingClientRect(); return { x: cv.left + (it[0] + it[2] / 2) * cv.width / sc.W, y: cv.top + (it[1] + it[3] / 2) * cv.height / sc.H }; });
    await p.mouse.move(r.x, r.y); await p.waitForTimeout(300); await p.mouse.move(r.x + 2, r.y); await p.waitForTimeout(300);
    T.check('mouse hover moves the focus', (await ev(p, () => SN.UI.top().focus)) === 3, await ev(p, () => SN.UI.top().focus));
    await p.screenshot({ path: OUTDIR + 'br-menu-hover.png' });
    await p.mouse.click(r.x, r.y); await p.waitForTimeout(500); T.check('a click activates (VERSUS)', (await ev(p, () => SN.UI.top().id)) === 'versus', await ev(p, () => SN.UI.top().id));
    T.check('prompts follow the mouse', (await ev(p, () => My3D2dge.current.input.lastDevice)) === 'mouse');
    await p.screenshot({ path: OUTDIR + 'br-versus.png' });
    T.check('no page errors (mouse)', errs.length === 0, errs);
    await ctx.close();
  }
  // a touch-only phone: the notice, SETTINGS, no touch controls; the attract still runs
  {
    const { p, errs, ctx } = await page({ ctx: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, init: () => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /any-pointer: fine|pointer: fine/.test(q) ? { matches: false, addEventListener() {}, removeEventListener() {} } : mm(q); } });
    await waitScene(p, 'title', 40000); await p.waitForTimeout(1200);
    T.check('touch-only is detected', await ev(p, () => SN.touchOnly()), await ev(p, () => navigator.maxTouchPoints));
    await p.screenshot({ path: OUTDIR + 'br-touch.png' });
    T.check('the SETTINGS button is there', await ev(p, () => Array.isArray(SN.game.scene._btn)), await ev(p, () => SN.game.scene._btn));
    T.check('no touch controls are drawn', (await ev(p, () => document.querySelectorAll('[data-sys="touch"]').length)) === 0);
    await until(p, () => My3D2dge.current.sceneName === 'attract', 120000); T.check('the attract runs on a touch-only device', (await ev(p, () => My3D2dge.current.sceneName)) === 'attract', await ev(p, () => My3D2dge.current.sceneName));
    await p.screenshot({ path: OUTDIR + 'br-attract-touch.png' });
    T.check('no page errors (touch)', errs.length === 0, errs);
    await ctx.close();
  }
  // split screen: two viewports, two pictures
  {
    const { p, errs, ctx } = await page(); await waitScene(p, 'title', 40000);
    await ev(p, () => { My3D2dge.current.addPlayer({ keys: 'right' }); SN.flow.start({ mode: 'versus', track: 'solenne', cls: 'SPARK', laps: 1, seed: 8, intro: false, players: [{ team: 'kestrel', pilot: 'vale' }, { team: 'volta', pilot: 'ferrante' }] }); });
    await waitScene(p, 'race'); await racing(p); await p.keyboard.down('KeyF'); await gameWait(p, 2.5);
    const img = readPNG(await p.screenshot({ path: OUTDIR + 'br-split.png' }));
    const top = stats(img, 0, 0, img.w, img.h / 2 - 4), bot = stats(img, 0, img.h / 2 + 4, img.w, img.h);
    let diff = 0; for (let y = 10; y < img.h / 2 - 10; y += 6) for (let x = 0; x < img.w; x += 6) { const a = img.px(x, y), b = img.px(x, y + Math.floor(img.h / 2)); diff += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); }
    T.check('split screen: both halves drawn', top.lit > .4 && bot.lit > .4, [top, bot]); T.check('split screen: two different cameras', diff > 100000, diff);
    T.check('split screen: P1 thrusts on F (the left half)', (await ev(p, () => My3D2dge.current.debug.race().humans[0].kmh)) > 50); await p.keyboard.up('KeyF');
    T.check('no page errors (split)', errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close();
}
