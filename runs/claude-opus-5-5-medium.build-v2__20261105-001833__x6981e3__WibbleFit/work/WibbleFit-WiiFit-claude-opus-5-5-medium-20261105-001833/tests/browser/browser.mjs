// Browser checks on the built html via file://. Prints only failures and a count.
import { chromium, firefox, webkit, devices } from 'playwright';
import { copyFileSync } from 'node:fs';
const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
const url = new URL('../../.build/game.html', import.meta.url).href;
let n = 0, fail = 0; const check = (name, c, d = '') => { n++; if (!c) { fail++; console.log(`FAIL ${name} ${String(d).slice(0, 400)}`); } };
const PAD = `window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] }; window.__pad2 = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] };
navigator.getGamepads = () => [{ id: 'Stub', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: __pad.axes, buttons: __pad.buttons }, window.__two ? { id: 'Stub2', index: 1, connected: true, mapping: 'standard', timestamp: performance.now(), axes: __pad2.axes, buttons: __pad2.buttons } : null, null, null];`;
async function open(browser, opts = {}, init = null) {
  const ctx = await browser.newContext(opts); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(url); return { ctx, page, errs };
}
const settled = (page) => page.waitForFunction(() => window.__GAME__ && !window.__GAME__.loading, null, { timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Software rendering on a shared machine can be very slow: wait for real frames, not only for time.
const pause = async (page, ms) => { await sleep(ms); try { const f0 = await page.evaluate(() => window.__GAME__?.frames ?? 0); await page.waitForFunction((f) => (window.__GAME__?.frames ?? 0) >= f + 5, f0, { timeout: 30000, polling: 40 }); } catch { /* the check that follows reports it */ } };
const state = (page) => page.evaluate(() => { const s = window.__GAME__.state(); delete s.slot; return s; });
const goto = async (page, id, args = {}) => { await page.evaluate(([i, a]) => window.__GAME__.go(i, a), [id, args]); await pause(page, 100); await settled(page); await pause(page, 200); };
const padBtn = (page, b, v) => page.evaluate(([b, v]) => { __pad.buttons[b].pressed = v; __pad.buttons[b].value = v ? 1 : 0; }, [b, v]);
const tap = async (page, b) => { await padBtn(page, b, true); await pause(page, 120); await padBtn(page, b, false); await pause(page, 120); };

const browser = await chromium.launch({ args: FLAGS });
// 14. Boot on WebGPU.
{ const { ctx, page, errs } = await open(browser, { viewport: { width: 1280, height: 720 } });
  await page.evaluate(() => window.__PIXEL_READY__); await pause(page, 800);
  const s = await state(page);
  check('boots on the title', s.scene === 'title', s.scene); check('backend webgpu', await page.evaluate(() => window.__PIXEL_ENGINE__.state().backend).then((b) => /webgpu/i.test(b)));
  check('music is exactly 0.10 on first run', s.volume.music === 0.1, JSON.stringify(s.volume));
  check('session inactive outside a session', await page.evaluate(() => !window.AIHub?.active));
  check('no errors at boot', errs.length === 0, errs.join('|'));
  check('html title', (await page.title()) === 'Wibble Fit');
  // 18. Audio after a real click.
  await page.mouse.click(640, 360); await pause(page, 400);
  const au = await page.evaluate(async () => { const G = window.__GAME__, a = G.engine.audio, c = a.context; if (!c) return { none: true }; const an = c.createAnalyser(); an.fftSize = 2048; a.buses.sfx.connect(an); a.buses.music.connect(an); const read = async () => { let m = 0; const d = new Float32Array(an.fftSize); for (let i = 0; i < 200 && m < 0.01; i++) { an.getFloatTimeDomainData(d); for (const v of d) m = Math.max(m, Math.abs(v)); await new Promise((r) => setTimeout(r, 40)); } return m; };
    G.sfx('fanfare'); const sfx = await read(); G.music('step'); a.setVolume('music', 0.1); await new Promise((r) => setTimeout(r, 300)); const music = await read(); return { state: c.state, sfx, music }; });
  check('audio context running', au.state === 'running', JSON.stringify(au)); check('sfx non-silent', au.sfx > 0.01, JSON.stringify(au)); check('music non-silent at 10%', au.music > 0.002, JSON.stringify(au));
  const v = await page.evaluate(async () => { const G = window.__GAME__; const m = await G.voiceTest(); return m; });
  check('voice RMS > .02', v.rms > 0.02, JSON.stringify(v)); check('Ounce mean pitch above Coach', v.ounce > v.coach, JSON.stringify(v));
  await ctx.close(); }
// 15. Pad, keys, mouse prompts.
{ const { ctx, page, errs } = await open(browser, { viewport: { width: 1280, height: 720 } }, PAD);
  await page.evaluate(() => window.__PIXEL_READY__); await pause(page, 500);
  await tap(page, 0); await pause(page, 300);
  let s = await state(page);
  check('pad cross opens main', s.overlays.includes('main'), JSON.stringify(s.overlays)); check('device pad', s.device === 'pad', s.device);
  check('PlayStation glyphs', s.prompts.confirm?.startsWith('pad-ps:cross'), s.prompts.confirm);
  await page.evaluate(() => { window.__GAME__.settings.glyphs = 'xb'; }); await pause(page, 200); s = await state(page);
  check('Xbox glyphs option', s.prompts.confirm?.startsWith('pad-xb'), s.prompts.confirm);
  await page.evaluate(() => { window.__GAME__.settings.glyphs = 'ps'; });
  await page.keyboard.press('ArrowDown'); await pause(page, 200); s = await state(page);
  check('key press switches to keycaps', s.device === 'keyboard' && s.prompts.confirm?.startsWith('keyboard:key:'), `${s.device} ${s.prompts.confirm}`);
  const rows = await page.evaluate(() => window.__GAME__.top().menu.rows.map((r) => ({ ...r })));
  const size = await page.evaluate(() => [window.__GAME__.ctx.hud.width, window.__GAME__.ctx.hud.height]);
  const toPx = (r) => [((r.x + r.w / 2) / size[0]) * 1280, ((r.y + r.h / 2) / size[1]) * 720];
  const [mx, my] = toPx(rows[3]);
  await page.mouse.move(mx, my, { steps: 3 }); await pause(page, 300); s = await state(page);
  check('mouse move switches to mouse prompts', s.device === 'mouse' && s.prompts.confirm?.startsWith('mouse:'), `${s.device} ${s.prompts.confirm}`);
  check('hover moves focus', (await page.evaluate(() => window.__GAME__.top().menu.index)) === 3);
  const [gx, gy] = toPx(rows[4]);
  await page.mouse.move(gx, gy); await pause(page, 150); await page.mouse.down(); await pause(page, 60); await page.mouse.up(); await pause(page, 250); s = await state(page);
  check('click activates (Settings)', s.overlays.includes('settings'), JSON.stringify(s.overlays));
  check('pad page no errors', errs.length === 0, errs.join('|'));
  await ctx.close(); }
// 16. Phone profile.
{ const { ctx, page, errs } = await open(browser, { ...devices['Pixel 7'] });
  await page.evaluate(() => window.__PIXEL_READY__); await pause(page, 800);
  let s = await state(page);
  check('touch-only flagged', s.touchOnly === true, s.touchOnly); check('engine.touch null', await page.evaluate(() => window.__PIXEL_ENGINE__.touch === null));
  check('message showing', s.rects.some((r) => r.tag === 'touch-message'), JSON.stringify(s.rects.slice(0, 4)));
  check('message fits', s.rects.filter((r) => r.tag === 'touch-message').every((r) => r.x >= 0 && r.x + r.w <= s.hudSize[0]), JSON.stringify(s.hudSize));
  check('settings button present', await page.evaluate(() => { const bs = [...document.querySelectorAll('button, [role=button]')]; return bs.some((b) => /⚙|settings/i.test(b.textContent + (b.title ?? '') + (b.ariaLabel ?? '') + (b.className ?? ''))); }));
  await page.evaluate(() => { window.__GAME__.idle = 9.9; }); await pause(page, 800); await settled(page); s = await state(page);
  check('attract runs on touch', !!s.attract, JSON.stringify(s.attract));
  await page.touchscreen.tap(200, 300); await pause(page, 600); await settled(page); s = await state(page);
  check('tap returns to title message', !s.attract && s.scene === 'title' && s.touchOnly, `${s.scene} ${JSON.stringify(s.attract)}`);
  check('phone no errors', errs.length === 0, errs.join('|'));
  await ctx.close(); }
// 17. Family Hour: 2 stub pads plus keyboard, three lanes.
{ const { ctx, page, errs } = await open(browser, { viewport: { width: 1280, height: 720 } }, PAD + 'window.__two = true;');
  await page.evaluate(() => window.__PIXEL_READY__); await pause(page, 300);
  await goto(page, 'join');
  await tap(page, 0); await page.evaluate(() => { __pad2.buttons[0].pressed = true; }); await pause(page, 120); await page.evaluate(() => { __pad2.buttons[0].pressed = false; }); await pause(page, 200);
  await page.keyboard.press('Enter'); await pause(page, 250);
  const claims = await page.evaluate(() => window.__GAME__.scene.claims.map((c) => c.kind + c.index));
  check('three devices claim', claims.length === 3, claims.join());
  await page.evaluate(() => { window.__GAME__.scene.bots = false; window.__GAME__.scene.begin(); }); await pause(page, 200); await settled(page);
  await page.waitForFunction(() => window.__GAME__.scene.partEv === 'event', null, { timeout: 30000 });
  await page.evaluate(() => { __pad.axes[0] = 1; __pad2.axes[0] = -1; });
  await page.keyboard.down('KeyW'); await pause(page, 1500);
  const lanes = await page.evaluate(() => window.__GAME__.scene.lanes.map((l) => ({ k: l.driver.kind, dot: l.sim?.dot ? [l.sim.dot.x, l.sim.dot.y] : null, s: l.sim })).map((l) => ({ k: l.k, dot: l.dot, r: l.s?.r, x: l.s?.x, ang: l.s?.ang })));
  await page.keyboard.up('KeyW');
  const ev = await page.evaluate(() => window.__GAME__.scene.viewName);
  if (ev === 'poses') { check('pad 1 moves right', lanes[0].dot[0] > 0.1, JSON.stringify(lanes)); check('pad 2 moves left', lanes[1].dot[0] < -0.1, JSON.stringify(lanes)); check('keyboard moves forward only', lanes[2].dot[1] > 0.1 && Math.abs(lanes[2].dot[0]) < 0.4, JSON.stringify(lanes)); }
  else check('family lanes run', lanes.length === 3, ev);
  check('family no errors', errs.length === 0, errs.join('|'));
  await ctx.close(); }
// 19. No layout overflow.
for (const [w, h] of [[1920, 1080], [1280, 720], [640, 360]]) {
  const { ctx, page, errs } = await open(browser, { viewport: { width: w, height: h } });
  await page.evaluate(() => window.__PIXEL_READY__); await pause(page, 300);
  const over = async (name) => { const s = await state(page); const [W, H] = s.hudSize; const bad = s.rects.filter((r) => r.x < -1 || r.y < -1 || r.x + r.w > W + 1 || r.y + r.h > H + 1); check(`${w}x${h} ${name} fits`, bad.length === 0 && s.rects.length > 0, `${W}x${H} ${JSON.stringify(bad.slice(0, 3))}`); };
  await over('title');
  await page.evaluate(() => window.__GAME__.scene.openMain()); await pause(page, 200); await over('main menu');
  await page.evaluate(() => window.__GAME__.scene.openDropIn()); await pause(page, 200); await over('drop-in');
  await goto(page, 'activity', { id: 'chair', mode: 'dropin' }); await over('activity card');
  await page.evaluate(() => { const s = window.__GAME__.scene; s.firstTime = false; s.afterIntro(); }); await page.waitForFunction(() => window.__GAME__.scene.phase === 'play', null, { timeout: 15000 }); await pause(page, 300); await over('pose play');
  await page.evaluate(() => window.__GAME__.openPause()); await pause(page, 200); await over('pause');
  await page.evaluate(async () => { const G = window.__GAME__; const { top } = { top: G.top() }; top.menu.items.find((i) => i.label === 'Settings').on(); }); await pause(page, 200); await over('settings');
  await page.evaluate(() => { window.__GAME__.close(); window.__GAME__.top().menu.items.find((i) => i.label === 'Dev Tools').on(); }); await pause(page, 200); await over('dev');
  await page.evaluate(() => { window.__GAME__.close(); window.__GAME__.top().menu.items.find((i) => i.label === 'About & Credits').on(); }); await pause(page, 200); await over('about');
  await page.evaluate(() => { window.__GAME__.close(); window.__GAME__.close(); window.__GAME__.engine.timeScale = 1; window.__GAME__.scene.forceFinish(2); }); await pause(page, 300); await over('results');
  check(`${w}x${h} no errors`, errs.length === 0, errs.slice(0, 2).join('|'));
  await ctx.close();
}
await browser.close();
// 20. No WebGPU browsers fail politely.
for (const [name, type, opts] of [['firefox', firefox, {}], ['webkit', webkit, { ...devices['iPhone 14'] }]]) {
  let b; try { b = await type.launch(); } catch (e) { check(`${name} launches`, false, e.message); continue; }
  const ctx = await b.newContext(opts); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(url); await sleep(2500);
  const text = await page.evaluate(() => document.body.innerText);
  const hasGpu = await page.evaluate(() => !!navigator.gpu);
  if (!hasGpu) { check(`${name} says WebGPU unavailable`, /WebGPU unavailable/i.test(text), text.slice(0, 200)); check(`${name} no page error`, errs.length === 0, errs.join('|')); }
  await b.close();
}
console.log(`${n - fail}/${n} passed`); process.exit(fail ? 1 : 0);
void copyFileSync;
