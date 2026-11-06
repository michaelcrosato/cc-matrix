// Browser tests (14-22) on the built html via file://. Prints "PASS n" and "FAIL message" lines for tools/test.mjs.
import { chromium, firefox, webkit, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { FLAGS, GAME } from '../../tools/lib.mjs';
let pass = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const PADSTUB = `window.__pads = [0,1,2,3].map(() => ({ on: false, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] }));
navigator.getGamepads = () => window.__pads.map((p, i) => p.on ? { id: 'Stub ' + i, index: i, connected: true, mapping: 'standard', timestamp: performance.now(), axes: p.axes, buttons: p.buttons } : null);`;
async function open(browser, { size = [1280, 720], init, context = {}, url = GAME, query = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, ...context });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(pathToFileURL(url).href + query);
  const ready = await page.evaluate(() => window.__PIXEL_READY__?.then(() => true, (e) => String(e))).catch((e) => String(e));
  return { ctx, page, errors, ready };
}
const step = (page, n = 1) => page.evaluate((n) => window.__PIXEL_ENGINE__.step(n), n);
const st = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__GAME__.state())));
const key = async (page, code, frames = 3) => { await page.evaluate((c) => window.__PIXEL_ENGINE__.input.setKey(c, true), code); await step(page, frames); await page.evaluate((c) => window.__PIXEL_ENGINE__.input.setKey(c, false), code); await step(page, 3); };
const go = (page, id, args = {}) => page.evaluate(async ([id, args]) => { await window.__GAME__.go(id, args, { instant: true }); window.__PIXEL_ENGINE__.step(3); }, [id, args]);
const FIXED_SLOT = () => { const a = window.__GAME__; a.save.clear(); a.freshSlot('Tester', 4); a.slot.drips = 60; a.slot.ages = [66, 61, 59, 57]; a.slot.tests = [0.3, 0.5, 0.55, 0.6]; };

async function groupMain() {
  const br = await chromium.launch({ headless: true, args: FLAGS });
  try {
    // ---- 14: boots on WebGPU, no errors, title visible, music exactly 0.10, AIHub inactive ----
    let g = await open(br);
    eq(g.ready, true, 'boots on WebGPU'); eq(g.errors, [], 'no page or console errors at boot');
    let s = await st(g.page);
    eq(s.scene, 'title', 'title scene visible'); ok(s.music === 0.1, `music volume is exactly 0.10 on first run (${s.music})`); eq(s.aiHub, false, 'outside a session AIHub is inactive'); eq(s.touchOnly, false, 'desktop is not touch-only');
    const gpuOk = await g.page.evaluate(() => window.__PIXEL_ENGINE__.state().backend); ok(/webgpu/i.test(gpuOk), `backend ${gpuOk}`);
    // ---- 22: normal game outside a session still runs ----
    await step(g.page, 120); eq((await g.page.evaluate(() => window.__PIXEL_ENGINE__.errors)).length, 0, 'runs outside a session without errors');
    // ---- 19: layout at the three sizes, many screens ----
    for (const size of [[1920, 1080], [1280, 720], [640, 360]]) {
      await g.page.setViewportSize({ width: size[0], height: size[1] }); await g.page.evaluate(FIXED_SLOT);
      const shots = [['title', {}], ['title', { menu: true }], ['hub', {}], ['weighin', { skill: 'good' }], ['jar', {}], ['locker', {}], ['records', {}], ['join', {}], ['report', {}], ['activity', { id: 'tree' }], ['activity', { id: 'squat', skipIntro: true }], ['activity', { id: 'step', skipIntro: true }], ['activity', { id: 'jog', skipIntro: true }], ['activity', { id: 'pier', skipIntro: true }], ['animviewer', {}]];
      for (const [id, args] of shots) { await go(g.page, id, args); await step(g.page, 200); const s2 = await st(g.page); eq(s2.layout, true, `layout fits at ${size.join('x')}: ${id} ${args.id ?? ''}`); }
      for (const mk of ['settings', 'about', 'pause', 'dev', 'results']) {
        await go(g.page, mk === 'results' ? 'activity' : 'title', mk === 'results' ? { id: 'tree', skipIntro: true } : { menu: true }); await step(g.page, 10);
        await g.page.evaluate((mk) => { const a = window.__GAME__, sc = a.scene; if (mk === 'results') { sc.finishNow(2); } else if (mk === 'settings') { import_.settings(sc); } }, mk).catch(() => {});
        await step(g.page, 120);
      }
      for (const mk of ['settings', 'about', 'dev', 'pause']) {
        await go(g.page, 'activity', { id: 'tree', skipIntro: true }); await step(g.page, 300);
        await g.page.evaluate((mk) => { const a = window.__GAME__, sc = a.scene; sc.openPause(); if (mk === 'settings') sc.stack[0].menu.items[sc.stack[0].menu.items.findIndex((i) => i.label === 'Settings')].onSelect(); if (mk === 'about') a.openAbout(sc); if (mk === 'dev') a.openDev(sc); }, mk); await step(g.page, 30);
        const s3 = await st(g.page); eq(s3.layout, true, `layout fits at ${size.join('x')}: overlay ${mk}`);
      }
    }
    await g.page.setViewportSize({ width: 1280, height: 720 });
    ok((await g.page.evaluate(() => window.__PIXEL_ENGINE__.errors)).length === 0, 'no engine errors across the layout tour');
    await g.ctx.close();
    // ---- 18: audio: SFX and music non-silent after a real click; voice RMS and pitch ----
    g = await open(br);
    await g.page.mouse.click(300, 300); await step(g.page, 30);
    const au = await g.page.evaluate(async () => {
      const a = window.__GAME__, au = a.engine.audio; au.unlock(); await new Promise((r) => setTimeout(r, 300));
      const ac = au.context; if (!ac) return { ctx: false };
      const an = ac.createAnalyser(); an.fftSize = 2048; au.buses.master?.connect?.(an); au.buses.sfx.connect(an); au.buses.music.connect(an);
      const buf = new Float32Array(2048); let mx = 0;
      a.music('plaza'); a.sfx('confirm'); a.sfx('bonk');
      for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 60)); an.getFloatTimeDomainData(buf); for (const v of buf) mx = Math.max(mx, Math.abs(v)); }
      const o = await a.voiceProbe('ounce', 'Thank you. I have written that down.'), c = await a.voiceProbe('coach', 'Thank you. I have written that down.');
      return { ctx: true, state: ac.state, mx, o, c, vol: au.volume };
    });
    ok(au.ctx, 'an AudioContext exists after a real click'); ok(au.mx > 0.0005, `SFX and music are non-silent (peak ${au.mx})`); ok(au.o.rms > 0.02, `Ounce voice RMS ${au.o.rms?.toFixed(3)} > .02`); ok(au.c.rms > 0.02, `Coach voice RMS ${au.c.rms?.toFixed(3)} > .02`); ok(au.o.f0 > au.c.f0, "Ounce's mean pitch exceeds Coach's"); ok(Math.abs(au.vol.music - 0.1) < 1e-9, 'music bus at 0.10');
    await g.ctx.close();
    // ---- 15: gamepad stub: prompts, glyph sets, device switching, hover and click ----
    g = await open(br, { init: PADSTUB });
    await g.page.evaluate(() => { window.__pads[0].on = true; }); await step(g.page, 20);
    await g.page.evaluate(() => { window.__pads[0].buttons[0] = { pressed: true, value: 1, touched: true }; }); await step(g.page, 10);
    await g.page.evaluate(() => { window.__pads[0].buttons[0] = { pressed: false, value: 0, touched: false }; }); await step(g.page, 20);
    s = await st(g.page); eq(s.device, 'pad', 'a pad press makes pad the last device'); eq(s.glyphSet, 'ps', 'PlayStation glyphs for the pad'); eq(s.mode, 'menu', 'the cross button confirms past the title');
    await step(g.page, 5); s = await st(g.page); eq(s.prompts?.set, 'ps', 'prompts record the PlayStation set');
    await g.page.evaluate(() => window.__GAME__.setSetting('glyph', 1)); await step(g.page, 5); s = await st(g.page); eq(s.glyphSet, 'xbox', 'the Settings option gives Xbox glyphs'); eq(s.prompts?.set, 'xbox', 'prompts follow: Xbox');
    await g.page.evaluate(() => window.__GAME__.setSetting('glyph', 0));
    await key(g.page, 'KeyW'); await step(g.page, 5); s = await st(g.page); eq(s.device, 'kb', 'a key press switches to the keyboard'); eq(s.prompts?.set, 'kb', 'prompts show keycaps');
    await g.page.mouse.move(400, 300); await g.page.mouse.move(520, 340); await g.page.evaluate(() => window.__PIXEL_ENGINE__.input.setPointer(0.3, 0.1, false)); await step(g.page, 3); await g.page.evaluate(() => window.__PIXEL_ENGINE__.input.setPointer(0.35, 0.12, false)); await step(g.page, 5); s = await st(g.page); eq(s.device, 'mouse', 'moving the mouse switches to mouse prompts');
    // hover moves focus; click activates (menu rows are in art pixels; read the rects)
    const rects = await g.page.evaluate(() => { const sc = window.__GAME__.scene; return { r: sc.menu.rects.map((r) => r && [r.x, r.y, r.w, r.h]), w: window.__GAME__.ctx.hud.width, h: window.__GAME__.ctx.hud.height }; });
    const target = rects.r[3]; const nx = ((target[0] + target[2] / 2) / rects.w) * 2 - 1, ny = 1 - ((target[1] + target[3] / 2) / rects.h) * 2;
    await g.page.evaluate(([x, y]) => window.__PIXEL_ENGINE__.input.setPointer(x, y, false), [nx, ny]); await step(g.page, 6);
    eq(await g.page.evaluate(() => window.__GAME__.scene.menu.focus), 3, 'hover moves the focus');
    await g.page.evaluate(([x, y]) => window.__PIXEL_ENGINE__.input.setPointer(x, y, true), [nx, ny]); await step(g.page, 3); await g.page.evaluate(([x, y]) => window.__PIXEL_ENGINE__.input.setPointer(x, y, false), [nx, ny]); await step(g.page, 6);
    eq(await g.page.evaluate(() => window.__GAME__.scene.stack[0]?.id), 'settings', 'a click activates the row');
    // ---- 17: Family Hour with 2 stub pads and the keyboard: three lanes move independently ----
    await go(g.page, 'join', {}); await g.page.evaluate(() => { window.__pads[1].on = true; });
    for (const press of [() => (window.__pads[0].buttons[0] = { pressed: true, value: 1 }), () => (window.__pads[1].buttons[0] = { pressed: true, value: 1 })]) { await g.page.evaluate(press); await step(g.page, 4); await g.page.evaluate(() => { window.__pads.forEach((p) => (p.buttons[0] = { pressed: false, value: 0 })); }); await step(g.page, 6); }
    await key(g.page, 'Enter', 3); await step(g.page, 10);
    s = await st(g.page); eq(s.seats, ['pad0', 'pad1', 'kb', null], 'three devices claim three mats');
    await g.page.evaluate(() => window.__GAME__.scene.start()); await g.page.evaluate(() => window.__PIXEL_ENGINE__.step(30));
    await g.page.waitForFunction(() => window.__GAME__.scene?.constructor?.id === 'activity' || window.__GAME__.state().scene === 'activity', null, { timeout: 20000 }).catch(() => {});
    for (let i = 0; i < 60 && (await g.page.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.step(30); return window.__GAME__.scene?.phase; })) !== 'play'; i++) await new Promise((r) => setTimeout(r, 30));
    await g.page.evaluate(() => { window.__pads[0].axes = [0.9, 0, 0, 0]; window.__pads[1].axes = [-0.9, 0.2, 0, 0]; window.__PIXEL_ENGINE__.input.setKey('KeyW', true); });
    await step(g.page, 90);
    const lanes = await g.page.evaluate(() => window.__GAME__.scene.lanes?.map((l) => [l.kind, +l.dot.x.toFixed(2), +l.dot.y.toFixed(2)]));
    ok(!!lanes && lanes.filter((l) => l[0] !== 'bot').length === 3, 'three human lanes in Family Hour: ' + JSON.stringify(lanes));
    if (lanes) { const hum = lanes.filter((l) => l[0] !== 'bot'); ok(new Set(hum.map((l) => l[1] + ',' + l[2])).size === 3, 'the three lanes move independently: ' + JSON.stringify(hum)); ok(hum[0][1] * hum[1][1] < 0 || hum[0][1] !== hum[1][1], 'pad 0 and pad 1 lean different ways'); }
    await g.ctx.close();
  } finally { await br.close(); }
}
async function groupTouch() {
  const br = await chromium.launch({ headless: true, args: FLAGS });
  try {
    const g = await open(br, { context: { ...devices['iPhone 13'] } });
    const s = await st(g.page); ok(s.touchOnly === true, 'touch-only device detected'); eq(s.scene, 'title', 'title on a phone');
    ok(await g.page.evaluate(() => !!document.querySelector('.settings-button')), 'the settings button is present');
    ok(await g.page.evaluate(() => window.__PIXEL_ENGINE__.touch === null), 'engine.touch is null (no touch controls)');
    await step(g.page, 30);
    const shown = await g.page.evaluate(() => { const a = window.__GAME__; return a.touchOnly && a.scene.mode === 'title'; }); ok(shown, '"Controller or keyboard required" message state');
    await g.page.evaluate(() => { window.__PIXEL_ENGINE__.manual = false; });
    await g.page.waitForFunction(() => window.__GAME__.state().attract === true, null, { timeout: 60000 }).catch(() => {});
    const att = await st(g.page); ok(att.attract === true, 'attract runs on a touch-only device'); eq(att.touchOnly, true, 'still touch-only');
    eq(await g.page.evaluate(() => window.__PIXEL_ENGINE__.errors.length), 0, 'no engine errors on the phone profile');
    await g.ctx.close();
  } finally { await br.close(); }
}
async function groupNoGpu() {
  for (const [name, type, ctxOpts] of [['webkit', webkit, { ...devices['iPhone 13'] }], ['firefox', firefox, {}]]) {
    let br; try { br = await type.launch({ headless: true }); } catch (e) { ok(true, `${name} not launchable here (${String(e.message).slice(0, 40)})`); continue; }
    try {
      const ctx = await br.newContext(ctxOpts); const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      await page.goto(pathToFileURL(GAME).href); await page.waitForTimeout(2500);
      const txt = await page.evaluate(() => document.body.innerText + ' ' + (document.querySelector('#app')?.innerText ?? ''));
      const hasGpu = await page.evaluate(() => !!navigator.gpu);
      if (!hasGpu) { ok(/WebGPU unavailable/i.test(txt), `${name}: the engine says "Failed to start: WebGPU unavailable"`); eq(errs, [], `${name}: no page error is thrown`); }
      else ok(true, `${name} has WebGPU here`);
      await ctx.close();
    } finally { await br.close(); }
  }
}
async function groupHub() {
  const dir = new URL('../../.build/hubtest/', import.meta.url).pathname; mkdirSync(dir, { recursive: true });
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL(`../../vendor/hub/${f}`, import.meta.url).pathname, dir + f);
  copyFileSync(GAME, dir + 'game.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript' };
  const srv = createServer((req, res) => { const p = new URL(req.url, 'http://x').pathname.slice(1) || 'harness.html'; const fp = dir + p; if (!existsSync(fp)) { res.statusCode = 404; res.end(); return; } res.setHeader('Content-Type', types[p.slice(p.lastIndexOf('.'))] ?? 'application/octet-stream'); res.end(readFileSync(fp)); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  const br = await chromium.launch({ headless: true, args: FLAGS });
  try {
    const runs = ['players=1', 'players=2', 'players=4&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave'];
    for (const q of runs) {
      const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&auto=1&${q}`);
      const title = await page.evaluate(async () => { try { const r = await fetch('game.html'); const t = await r.text(); return /<title>([^<]*)<\/title>/.exec(t)?.[1]; } catch { return null; } });
      ok(title === 'Why Fit', `the served page is our game (${title})`);
      await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 120000 }).catch(() => {});
      const res = await page.evaluate(() => ({ pass: window.__hubCheck?.pass, checks: (window.__hubCheck?.checks ?? []).filter((c) => !c.ok && c.ok !== undefined).map((c) => `${c.name}: ${c.detail}`) }));
      ok(res.pass === true, `hub harness ${q}: ${res.pass} ${res.checks.slice(0, 4).join(' | ')}`);
      await ctx.close();
    }
  } finally { await br.close(); srv.close(); }
}
const only = process.argv.slice(2);
for (const [name, fn] of [['main', groupMain], ['touch', groupTouch], ['nogpu', groupNoGpu], ['hub', groupHub]]) {
  if (only.length && !only.includes(name)) continue;
  try { await fn(); } catch (e) { fails.push(`browser group ${name} threw: ${String(e?.stack ?? e).split('\n').slice(0, 3).join(' | ')}`); }
}
console.log(`PASS ${pass}`); for (const f of fails) console.log('FAIL ' + f);
process.exit(0);
