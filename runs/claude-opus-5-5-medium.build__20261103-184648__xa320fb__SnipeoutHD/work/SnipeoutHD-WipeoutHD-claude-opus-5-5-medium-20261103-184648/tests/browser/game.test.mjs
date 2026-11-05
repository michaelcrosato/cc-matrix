// The bundle in headless Chromium from file:// (WebGL 2: headless WebGPU is SwiftShader's): it boots, draws a real 3D
// picture, and every input device works; screenshots go to tests/out/ for a look
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { test, check, done } from '../lib/t.mjs';
import { decode, stats } from '../lib/png.mjs';
const root = new URL('../../', import.meta.url).pathname, out = root + 'tests/out/'; mkdirSync(out, { recursive: true });
const url = 'file://' + root + '../SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648.html?backend=webgl';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const errors = [];
const open = async (o = {}) => { const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o)); const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message)); if (o.init) await page.addInitScript(o.init); await page.goto(url); return { ctx, page }; };
const waitScene = async (page, name, ms = 40000) => { await page.waitForFunction(n => window.__game && window.__game.sceneName === n, name, { timeout: ms }); };
const shot = async (page, name) => { const b = await page.screenshot(); writeFileSync(out + name + '.png', b); return decode(b); };
const ev = (page, f, a) => page.evaluate(f, a);
let page, ctx;
await test('the bundle boots from file://', async () => {
  const t0 = Date.now(); ({ page, ctx } = await open()); await waitScene(page, 'title');
  check(Date.now() - t0 < 40000, 'boots in under 40 s', Date.now() - t0);
  const b = await ev(page, () => My3D2dge.World3D.backend); check(b === 'WebGL 2' || b === 'WebGPU', 'a 3D backend', b);
  await page.waitForTimeout(1500); const img = await shot(page, 'title'); const s = stats(img); check(s.lit > .4 && s.colors > 24, 'the title draws the 3D world', s);
});
await test('menus: keyboard, mouse hover and click', async () => {
  await page.keyboard.press('Enter'); await waitScene(page, 'menu'); await page.waitForTimeout(800); await shot(page, 'menu-main');
  const r = await ev(page, () => SN.UI.rects.map(q => q && q.slice())); const k = 3, S = 1280 / await ev(page, () => window.__game.W);
  await page.mouse.move((r[k][0] + 20) * S, (r[k][1] + 8) * S); await page.waitForTimeout(150); await page.mouse.move((r[k][0] + 24) * S, (r[k][1] + 9) * S); await page.waitForTimeout(300);
  check(await ev(page, () => SN.UI.focus) === k, 'hover moves the focus');
  await page.mouse.click((r[1][0] + 20) * S, (r[1][1] + 8) * S); await page.waitForTimeout(400); check(await ev(page, () => SN.UI.top().id) === 'class', 'a click opens QUICK RACE'); await shot(page, 'menu-class');
  await page.keyboard.press('Enter'); await page.waitForTimeout(400); await shot(page, 'menu-track'); await page.keyboard.press('Enter'); await page.waitForTimeout(600); await shot(page, 'menu-team');
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
});
await test('a race renders; the keyboard drives', async () => {
  await ev(page, () => window.__game.go('loading', { setup: { mode: 'race', track: 'karakum', cls: 'flare', team: 'volta', pilot: 'luca', laps: 3, intro: true } }));
  await waitScene(page, 'race'); await page.waitForTimeout(1500); await shot(page, 'race-intro');
  await page.keyboard.press('Enter'); await page.waitForFunction(() => SN.scenes.race.race.state === 'racing', null, { timeout: 60000 });
  await page.keyboard.down('KeyW'); await page.waitForFunction(() => SN.scenes.race.race.t > 3, null, { timeout: 60000 });
  const v = await ev(page, () => SN.Ship.fwdSpeed(SN.scenes.race.race.humans[0])); check(v > 600, 'W thrusts', v);
  const img = await shot(page, 'race-chase'), s = stats(img); check(s.lit > .4 && s.colors > 24, 'the race draws', s);
  await page.keyboard.press('KeyC'); await page.waitForTimeout(500); await shot(page, 'race-farchase'); await page.keyboard.press('KeyC'); await page.waitForTimeout(500); await shot(page, 'race-cockpit'); await page.keyboard.press('KeyC');
  await page.keyboard.up('KeyW');
  await ev(page, () => { const R = SN.scenes.race.race; R.weapons.give(R.humans[0], 'rail'); R.humans[0].pickT = 0; }); await page.waitForTimeout(300); await shot(page, 'race-weapon-hud');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500); check(await ev(page, () => window.__game.paused), 'Esc pauses'); await shot(page, 'pause');
  await ev(page, () => { window.__game.resume(); SN.Dev.show(); }); await page.waitForTimeout(300); await shot(page, 'dev-cheats'); await ev(page, () => { SN.Dev.tab = 1; }); await page.waitForTimeout(200); await shot(page, 'dev-tuning'); await ev(page, () => { SN.Dev.open = false; });
});
await test('a gamepad: analog triggers and PlayStation prompts', async () => {
  const gp = { L2: 0, cross: false };
  await ev(page, () => { window.__pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [window.__pad]; });
  await ev(page, () => { const p = window.__pad; p.buttons[0] = { pressed: true, value: 1 }; p.buttons[6] = { pressed: true, value: .5 }; });
  await page.waitForTimeout(800);
  const c = await ev(page, () => SN.scenes.race.race.humans[0].ctl);
  check(c.thrust === 1 && Math.abs(c.brakeL - .5) < .02, '✕ thrusts, L2 at half is half an airbrake', c);
  check(await ev(page, () => SN.deviceOf(window.__game.input)) === 'gamepad' && await ev(page, () => SN.glyph.text(window.__game.input, 'fire')) === '□', 'prompts switch to PlayStation glyphs');
  await shot(page, 'race-pad-prompts');
  await ev(page, () => window.__game.settings.set('glyphs', 'xbox')); check(await ev(page, () => SN.glyph.text(window.__game.input, 'fire')) === 'X', 'the Xbox setting shows X'); await ev(page, () => window.__game.settings.set('glyphs', 'playstation'));
  await ev(page, () => { const p = window.__pad; p.buttons[0] = { pressed: false, value: 0 }; p.buttons[6] = { pressed: false, value: 0 }; });
});
await test('split screen', async () => {
  await ev(page, () => { const g = window.__game; if (g.players.length < 2) g.addPlayer({ keys: 'right' }); g.go('loading', { setup: { mode: 'versus', vmode: 'race', track: 'meridian', cls: 'flare', laps: 2, intro: false, players: [{ team: 'kestrel', pilot: 'ingrid' }, { team: 'caldera', pilot: 'mateo' }] } }); });
  await waitScene(page, 'race'); await page.keyboard.down('KeyF'); await page.waitForTimeout(5000);
  const img = await shot(page, 'versus'); const top = stats(img, 0, 0, 1280, 350), bot = stats(img, 0, 370, 1280, 720);
  check(await ev(page, () => window.__game.viewports.length) === 2 && top.lit > .4 && bot.lit > .4, 'two viewports, both drawn', [top, bot]);
  await page.keyboard.up('KeyF'); await ev(page, () => { const g = window.__game; g.go('menu'); g.removePlayer(g.players[1]); });
});
await test('the other worlds', async () => {
  for (const [tr, mode] of [['solenne', 'race'], ['meridian', 'snipeout'], ['borealis', 'race'], ['karakum', 'overclock']]) {
    await ev(page, ([t, m]) => window.__game.go('loading', { setup: { mode: m, track: t, cls: 'storm', team: 'nullset', pilot: 'kaizero', laps: 3, intro: false } }), [tr, mode]); await waitScene(page, 'race');
    await ev(page, () => { const R = SN.scenes.race.race; R.getHuman = sh => SN.AI.controls(sh, R, { skill: 1, stateKey: 'bot' }); }); await page.waitForTimeout(9000);
    const img = await shot(page, 'world-' + tr + '-' + mode), s = stats(img); check(s.lit > (mode === 'overclock' ? .07 : .3) && s.colors > 20, tr + ' draws', s);
  }
  await ev(page, () => window.__game.go('menu', { screen: 'main' })); await waitScene(page, 'menu'); await page.waitForTimeout(500);
  await ev(page, () => SN.UI.push(SN.screens.about())); await page.waitForTimeout(500); await shot(page, 'about');
  await ev(page, () => { SN.UI.pop(); SN.UI.push(SN.screens.howto()); }); await page.waitForTimeout(400); await shot(page, 'howto');
  await ev(page, () => { SN.UI.pop(); SN.save.data.started = true; SN.UI.push(SN.screens.season()); }); await page.waitForTimeout(400); await shot(page, 'season');
});
await test('attract mode', async () => { await ev(page, () => window.__game.go('title')); await waitScene(page, 'title'); await page.waitForFunction(() => window.__game.sceneName === 'attract', null, { timeout: 60000 }).catch(() => {}); check(await ev(page, () => window.__game.sceneName) === 'attract', 'attract after 10 s'); await page.waitForTimeout(6000); await shot(page, 'attract'); await page.keyboard.press('KeyK'); await page.waitForTimeout(400); check(await ev(page, () => window.__game.sceneName) === 'title', 'a key exits'); });
await ctx.close();
await test('touch-only: the notice, a settings button, no touch controls, attract', async () => {
  const t = await open({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 }, init: () => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /any-pointer: fine/.test(q) ? { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); } });
  await waitScene(t.page, 'title'); await t.page.waitForTimeout(1500); await shot(t.page, 'touch-only');
  check(await ev(t.page, () => SN.isTouchOnly()), 'detected as touch-only');
  check(await ev(t.page, () => !document.querySelector('[data-sys="touch"] button[data-act]:not([data-act="menu"])')), 'no touch buttons');
  await t.page.waitForFunction(() => window.__game.sceneName === 'attract', null, { timeout: 60000 }).catch(() => {}); check(await ev(t.page, () => window.__game.sceneName) === 'attract', 'the attract mode runs');
  await t.ctx.close();
});
check(!errors.length, 'no page errors', errors.slice(0, 3));
await browser.close();
done();
