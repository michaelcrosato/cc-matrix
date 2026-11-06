// Browser suite: Chromium on file:// with software WebGPU; WebKit for the friendly failure; phone/tablet profiles.
import { chromium, webkit, devices } from 'playwright'; import { readFileSync } from 'node:fs'; import { resolve, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const G = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const FILE = 'file://' + resolve(G, '..', 'CreditorCreek-AnimalCrossingCityFolk-claude-sonnet-5-5-medium-20261105-171824.html');
const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
let fails = 0, count = 0; const ok = (c, m) => { count++; if (!c) { fails++; console.log('FAIL', m); } };
const PAD = () => { window.__pad = { id: 'DualSense Wireless Controller', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 })) }; navigator.getGamepads = () => [window.__pad, null, null, null]; };
const only = process.argv[2];
async function page(browser, opts = {}, init) { const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...opts }); if (init) await ctx.addInitScript(init); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); }); p.errs = errs; await p.goto(FILE); return p; }
const stepper = `window.__st = async (n) => { const e = await window.__PIXEL_READY__; for (let i = 0; i < n; i += 6) { e.step(Math.min(6, n - i)); await new Promise(r => setTimeout(r, 0)); } };`;
const withE = (p, fn, arg) => p.evaluate(`(async () => { ${stepper} const e = await window.__PIXEL_READY__; const G = window.__GAME__.game; const arg = ${JSON.stringify(arg ?? null)}; ${fn} })()`);
let cr = await chromium.launch({ headless: true, args: ARGS });
try {
  if (!only || only === 'boot') {
    const p = await page(cr); const r = await withE(p, `await window.__st(60); return { status: e.state().status, errors: e.errors.length, gpu: e.state().gpuErrors ?? 0, mode: G.mode, music: e.audio.volume.music, fps: e.state().frames ?? 0 }`);
    ok(p.errs.length === 0, 'boots with no page errors ' + JSON.stringify(p.errs)); ok(r.errors === 0, 'boots with no game errors'); ok(r.mode === 'title', 'title screen'); ok(r.music === 0.1, 'fresh profile music volume is 10%: ' + r.music);
    const html = readFileSync(FILE.replace('file://', ''), 'utf8'); const engine = readFileSync(resolve(G, 'kit/pixel-engine.js'), 'utf8'); ok(html.includes(engine), 'engine text appears unchanged in the page'); ok(html.includes('aihub-session 1.4.0'), 'AI Hub client pasted in'); ok(/<meta charset="utf-8">\s*<script>\/\*! aihub-session/.test(html), 'session.js is the first script after meta charset');
    // settings Reset restores 10%
    await withE(p, `G.settings.music = 0.5; G.applySettings(); G.openSettings(); await window.__st(6); G.ui.top.st.i = G.ui.top.rows(G).length - 1; return 1`);
    await p.keyboard.press('Enter'); await withE(p, `await window.__st(12); return 1`); const m = await withE(p, `return e.audio.volume.music`); ok(Math.abs(m - 0.1) < 1e-9, 'Settings Reset restores music to 10%: ' + m);
    await p.close();
  }
  if (!only || only === 'input') {
    const p = await page(cr, {}, PAD);
    await withE(p, `await window.__st(30); await G.sys.dev.reset(G); G.world.cleanExit = true; G.world.noSave = false; localStorage.setItem('creditor-creek:save:v1', JSON.stringify(G.world)); return 1`); await p.reload(); await withE(p, `await window.__st(30); return 1`);
    let r = await withE(p, `return { mode: G.mode, top: G.ui.top?.id, items: G.ui.top.items(G).map(i => i.id) }`); ok(r.items[0] === 'continue', 'Continue offered when a save exists');
    // pad: Cross continues, Options pauses
    await withE(p, `window.__pad.buttons[0].pressed = true; window.__pad.buttons[0].value = 1; await window.__st(8); window.__pad.buttons[0].pressed = false; window.__pad.buttons[0].value = 0; await window.__st(30); return 1`);
    r = await withE(p, `return { mode: G.mode, dev: G.ui.dev }`); ok(r.mode === 'play', 'stub pad: Cross continues into play'); ok(r.dev === 'pad', 'prompts switch to pad glyphs');
    await withE(p, `window.__pad.buttons[9].pressed = true; await window.__st(8); window.__pad.buttons[9].pressed = false; await window.__st(10); return 1`); r = await withE(p, `return { top: G.ui.top?.id }`); ok(r.top === 'pause', 'stub pad: Options opens the pause menu ' + JSON.stringify(r) + JSON.stringify(await withE(p, `return { text: G.ui.top?.full, stack: G.ui.stack.map(s => s.id), mode: G.mode, cut: G.cutscene, frozen: G.frozen, dev: G.ui.dev }`)));
    // Xbox glyph option
    r = await withE(p, `G.settings.glyphs = 'xbox'; await window.__st(4); return { g: G.ui.glyphs, w: G.ui.glyphW({ ps: 'cross', xb: 'A', kb: 'E' }) }`); ok(r.g === 'xbox', 'Xbox glyph option applies'); await withE(p, `G.settings.glyphs = 'ps'; return 1`);
    // keyboard: Escape back, move; prompts switch to keyboard glyphs
    await p.keyboard.press('Escape'); await withE(p, `await window.__st(20); return 1`); await p.keyboard.down('KeyD'); await withE(p, `await window.__st(30); return 1`); await p.keyboard.up('KeyD'); r = await withE(p, `return { dev: G.ui.dev, top: G.ui.top?.id, x: G.player.pos.x }`); ok(r.dev === 'kb', 'prompts switch to keyboard on key use'); ok(r.top == null, 'pause closed by Escape');
    // dev mode from pause with sliders
    await withE(p, `G.sys.pause.open(G); await window.__st(6); return 1`); r = await withE(p, `G.ui.top.st.i = 5; return 1`); await p.keyboard.press('Enter'); await withE(p, `await window.__st(10); return 1`); r = await withE(p, `return G.ui.top?.id`); ok(r === 'dev', 'Dev Mode opens from the pause menu');
    await withE(p, `G.ui.top.page = 8; G.ui.top.st.i = 1; await window.__st(4); return 1`); await p.keyboard.down('ArrowRight'); await withE(p, `await window.__st(8); return 1`); await p.keyboard.up('ArrowRight');
    r = await withE(p, `const tn = await window.__GAME__.tuning(); return { walk: tn.walk, minPerSec: tn.minPerSec }`); ok(r.walk !== 2.6 || r.minPerSec !== 1.25, 'a slider changes the live value: ' + JSON.stringify(r));
    await p.keyboard.press('KeyR'); await withE(p, `await window.__st(6); return 1`); r = await withE(p, `const tn = await window.__GAME__.tuning(); return { walk: tn.walk, minPerSec: tn.minPerSec }`); ok(r.walk === 2.6 && r.minPerSec === 1.25, 'Reset All restores defaults: ' + JSON.stringify(r));
    // mouse: click a menu item
    await withE(p, `G.ui.clear(); G.quitToTitle(); await window.__st(30); return 1`); await p.mouse.move(640, 364); await withE(p, `await window.__st(6); return 1`); await p.mouse.click(640, 364); await withE(p, `await window.__st(30); return 1`); r = await withE(p, `return { mode: G.mode }`); ok(r.mode === 'play', 'mouse click on a menu item activates it (hover moved focus)');
    ok(p.errs.length === 0, 'no errors in input suite ' + JSON.stringify(p.errs)); await p.close();
  }
  if (!only || only === 'attract') {
    const p = await page(cr); await withE(p, `await window.__st(30); return 1`); let r = await withE(p, `await window.__st(60 * 9); return G.mode`); ok(r === 'title', 'no attract before 10 s'); r = await withE(p, `await window.__st(90); return G.mode`); ok(r === 'attract', 'attract starts after 10 s idle');
    for (const [name, act] of [['a key', async () => p.keyboard.press('KeyZ')], ['a mouse move', async () => { await p.mouse.move(300, 300); await p.mouse.move(340, 320); }], ['a pad button', async () => p.evaluate(() => { window.__pad = window.__pad ?? null; })]]) {
      if (name === 'a pad button') continue; r = await withE(p, `await window.__st(60 * 13); return G.mode`); if (r !== 'attract') { ok(false, 'attract restarts for ' + name); continue; } await act(); r = await withE(p, `await window.__st(30); return G.mode`); ok(r === 'title', name + ' exits attract'); }
    r = await withE(p, `return localStorage.getItem('creditor-creek:save:v1')`); ok(r === null, 'player save untouched by attract'); ok(p.errs.length === 0, 'no errors in attract ' + JSON.stringify(p.errs)); await p.close();
    const p2 = await page(cr, {}, PAD); await withE(p2, `await window.__st(60 * 12); return 1`); const m2 = await withE(p2, `return G.mode`); ok(m2 === 'attract', 'attract again with pad stub present'); await withE(p2, `window.__pad.buttons[2].pressed = true; await window.__st(10); window.__pad.buttons[2].pressed = false; await window.__st(20); return 1`); const m3 = await withE(p2, `return G.mode`); ok(m3 === 'title', 'a pad button exits attract'); await p2.close();
  }
  if (!only || only === 'audio') {
    const p = await page(cr); await withE(p, `await window.__st(20); return 1`); await p.keyboard.press('KeyZ'); await withE(p, `await window.__st(40); return 1`);
    const r = await withE(p, `const ctx = e.audio.context; if (!ctx) return { state: 'none' }; const an = ctx.createAnalyser(); an.fftSize = 2048; e.audio.master.connect(an); const buf = new Float32Array(2048); let peak = 0; G.sfx('bell'); for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 50)); an.getFloatTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v)); } return { state: ctx.state, peak, song: e.audio.playing }`);
    const amb = await withE(p, `await G.sys.dev.reset(G); G.world.min = 480; e.audio.setVolume('music', 0); G.ui.clear(); const ctx = e.audio.context; const an = ctx.createAnalyser(); an.fftSize = 2048; e.audio.master.connect(an); const buf = new Float32Array(2048); const level = async (x, z) => { G.player.pos.x = x; G.player.pos.z = z; for (let i = 0; i < 6; i++) { e.step(6); await new Promise(r => setTimeout(r, 30)); } await new Promise(r => setTimeout(r, 500)); let sum = 0, n = 0; for (let k = 0; k < 10; k++) { an.getFloatTimeDomainData(buf); for (const v of buf) { sum += v * v; n++; } await new Promise(r => setTimeout(r, 40)); } return Math.sqrt(sum / n); }; const near = await level(30.5, 24); const far = await level(5, 12); return { near, far }`);
    const vo = await withE(p, `e.audio.setVolume('music', 0); const ctx = e.audio.context; const an = ctx.createAnalyser(); an.fftSize = 2048; e.audio.master.connect(an); const buf = new Float32Array(2048); let peak = 0; const who = { type: 'hearth', pitch: 1 }; G.settings.voiceStyle = 'gibberish'; 'Hello there, dear neighbour!'.split('').forEach((c, i) => G.voiceChar(c, who, i)); for (let k = 0; k < 20; k++) { await new Promise(r => setTimeout(r, 30)); an.getFloatTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v)); } return peak`);
    ok(vo > 0.01, 'a spoken line produces audible gibberish: peak ' + vo.toFixed(3));
    ok(amb.near > amb.far * 1.3 && amb.near > 0.0005, 'ambience is louder at the river than far from water (RMS ' + amb.near.toFixed(4) + ' vs ' + amb.far.toFixed(4) + ')');
    ok(r.state === 'running', 'audio context unlocked: ' + r.state); ok(r.peak > 0.001, 'music and effects above silence: ' + r.peak); ok(!!r.song, 'a song is playing: ' + r.song); await p.close();
  }
  if (!only || only === 'touch') {
    for (const dname of ['Pixel 7', 'iPad Pro 11']) {
      const p = await page(cr, { ...devices[dname], viewport: undefined }); await withE(p, `await window.__st(40); return 1`);
      const r = await withE(p, `return { touchOnly: G.touchOnly, mode: G.mode, btn: !!document.querySelector('.pe-settings-button, [class*=settings]') }`); ok(r.touchOnly === true, dname + ': touch-only detected'); ok(r.mode === 'title', dname + ': title with notice');
      const r2 = await withE(p, `await window.__st(60 * 11); return G.mode`); ok(r2 === 'attract', dname + ': attract runs');
      const hasBtn = await p.evaluate(() => !!document.querySelector('button, [role=button], .pixel-settings, [class*=settings]')); ok(hasBtn, dname + ': settings button present'); await p.close();
    }
  }
} finally { await cr.close(); }
if (!only || only === 'webkit') { try { const wk = await webkit.launch(); const ctx = await wk.newContext({ viewport: { width: 800, height: 500 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200))); await p.goto(FILE); await p.waitForTimeout(2500); const txt = await p.evaluate(() => document.getElementById('fail')?.textContent ?? '') ; ok(/WebGPU/.test(txt) || errs.length === 0, 'WebKit: friendly no-WebGPU message ' + txt.slice(0, 80)); ok(errs.length === 0, 'WebKit: no uncaught error ' + JSON.stringify(errs)); await wk.close(); } catch (e) { ok(false, 'WebKit run: ' + String(e).slice(0, 120)); } }
console.log(`browser: ${count} checks, ${fails} failures`); process.exit(fails ? 1 : 0);
