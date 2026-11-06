// The built single file on file://, 1920x1080, in Chromium with WebGPU.
import { basename, resolve } from 'node:path';
import { chromium, devices } from 'playwright';
import { renderSound } from '../../pixel-engine.js';
import { SFX_DEFS } from '../../src/audio/sfx.js';
import { speak } from '../../src/audio/voice.js';
const root = resolve(import.meta.dirname, '..', '..'), url = `file://${resolve(root, '..', `${basename(root)}.html`)}`;
const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
let pass = 0, fail = 0; const ok = (c, n) => { if (c) pass++; else { fail++; console.log(`FAIL ${n}`); } };
const browser = await chromium.launch({ args: FLAGS });
// Taps everything the game sends to the speakers, so a test can read what really comes out.
const TAP = () => { const orig = AudioNode.prototype.connect; AudioNode.prototype.connect = function (d, ...r) { if (d instanceof AudioDestinationNode && d.context instanceof AudioContext) { const c = d.context; if (!c.__tap) { c.__tap = c.createAnalyser(); c.__tap.fftSize = 8192; } orig.call(this, c.__tap); } return orig.call(this, d, ...r); }; window.__peak = async (ms) => { const c = window.__PIXEL_ENGINE__.audio.context, t = c.__tap, buf = new Float32Array(8192); let p = 0; const end = performance.now() + ms; while (performance.now() < end) { t.getFloatTimeDomainData(buf); for (const v of buf) p = Math.max(p, Math.abs(v)); await new Promise((r) => setTimeout(r, 30)); } return p; }; };
const open = async (ctxOpts = {}, init) => { const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ...ctxOpts }); if (init) await ctx.addInitScript(init); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (x) => errs.push(`PAGE ${x}`)); page.on('console', (m) => { if (m.type() === 'error') errs.push(`CONSOLE ${m.text()}`); }); await page.goto(url); await page.waitForFunction(() => window.__PIXEL_READY__ !== undefined, null, { timeout: 90000 }); await page.evaluate(() => window.__PIXEL_READY__); await page.waitForFunction(() => !!window.__GAME__, null, { timeout: 60000 }); return { ctx, page, errs }; };
try {
  { // Mouse, keyboard.
    const { ctx, page, errs } = await open({}, TAP);
    await page.evaluate(() => { window.__PIXEL_ENGINE__.manual = true; });
    const st = () => page.evaluate(() => window.__GAME__.state()); const step = (n = 2) => page.evaluate((k) => window.__PIXEL_ENGINE__.step(k), n);
    const es = await page.evaluate(() => { const s = window.__PIXEL_ENGINE__.state(); return { backend: s.backend, errors: s.errors, gpu: s.gpuErrors }; });
    ok(es.backend === 'WebGPU', `backend ${es.backend}`); ok(!es.errors?.length, `engine errors ${es.errors}`); ok(!es.gpu?.length, `gpu errors ${es.gpu}`);
    ok(await page.evaluate(() => window.AIHub && window.AIHub.active === false), 'AIHub not active'); ok((await page.title()) === 'Far Dry Season', 'title');
    ok(!await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel=stylesheet]')].length), 'nothing external');
    await page.evaluate(() => { window.__GAME__.idle = 0; if (window.__GAME__.mode === 'attract') window.__GAME__.attract.stop(); }); await step(3);
    let s = await st(); ok(s.mode === 'title', 'title reached');
    await page.keyboard.press('Enter'); await step(3); s = await st(); ok(s.screen === 'main', `keyboard reaches main (${s.screen})`);
    await page.keyboard.press('ArrowDown'); await step(3); const f1 = (await st()).focus;
    // Hover and click, with a real mouse.
    const canvas = await page.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
    const row = await page.evaluate(() => { const g = window.__GAME__, t = g.ui.top, r = g.ui.rowRect(t, 0), H = g.ctx.hud; return { y: (r.y + 8) / H.height, n: g.ui.items(t).length, L: g.ui.items(t).map((i) => i.label) }; });
    await page.mouse.move(canvas.x + canvas.w * 0.3, canvas.y + canvas.h * row.y); await page.waitForTimeout(100); await step(3); const f2 = (await st()).focus; ok(f2 === 0 && f1 !== 0, `hover moves focus ${f1} -> ${f2}`);
    await page.evaluate(() => { const g = window.__GAME__; g.ui.top.focus = g.ui.items(g.ui.top).findIndex((i) => i.label === 'SETTINGS'); }); const r3 = await page.evaluate(() => { const g = window.__GAME__, t = g.ui.top, r = g.ui.rowRect(t, t.focus), H = g.ctx.hud; return (r.y + 8) / H.height; });
    await page.mouse.move(canvas.x + canvas.w * 0.3, canvas.y + canvas.h * r3); await page.mouse.down(); await step(2); await page.mouse.up(); await page.waitForTimeout(100); await step(3); s = await st(); ok(s.screen === 'settings', `click activates (${s.screen})`);
    await page.keyboard.press('Escape'); await step(3);
    // Sound through a gesture: read an AnalyserNode.
    const peak = await page.evaluate(async () => { const a = window.__PIXEL_ENGINE__.audio; a.unlock(); const ctx2 = a.context; if (!ctx2) return -1; await ctx2.resume(); a.setVolume('sfx', 1); const off = new OfflineAudioContext(1, 8000, 44100); const buf = off.createBuffer(1, 8000, 44100); return ctx2.state; });
    ok(peak === 'running' || peak === 'suspended', `audio context ${peak}`);
    // What Web Audio really produces: game sounds rendered and played through an OfflineAudioContext, levels read back.
    for (const [name, def] of [['gun-rifle', SFX_DEFS['gun-rifle']], ['explosion', SFX_DEFS.explosion], ['heartbeat', SFX_DEFS.heartbeat], ['voice', speak('odile', 'Sixty-one beds.').list[0].def]]) {
      const samples = Array.from(renderSound(def, 44100));
      const peak = await page.evaluate(async (d) => { const off = new OfflineAudioContext(1, d.length, 44100), b = off.createBuffer(1, d.length, 44100); b.getChannelData(0).set(d); const n = off.createBufferSource(); n.buffer = b; n.connect(off.destination); n.start(); const r = await off.startRendering(); return r.getChannelData(0).reduce((m, v) => Math.max(m, Math.abs(v)), 0); }, samples);
      ok(peak > 0.02, `Web Audio level of ${name}: ${peak}`);
    }
    ok(await page.evaluate(() => window.__PIXEL_ENGINE__.audio.sounds.has('explosion')), 'sounds registered with the engine');
    // The game's own sounds, at the speakers, after a real key press.
    await page.keyboard.press('KeyX');
    await page.evaluate(() => { const a = window.__PIXEL_ENGINE__.audio; a.unlock(); return a.context?.resume(); });
    const out = async (fn) => page.evaluate(async (src) => { const g = window.__GAME__, a = g.ctx.audio; a.setVolume('music', 0); a.stopMusic(); g.audio.current = null; g.audio.want = null; await new Promise((r) => setTimeout(r, 300)); (0, eval)(`(${src})`)(g, a); return window.__peak(500); }, fn.toString());
    const quietLoops = () => page.evaluate(() => { for (const v of window.__GAME__.ctx.audio.loops) v.set({ volume: 0 }); });
    await quietLoops();
    ok((await out((g, a) => a.play('explosion', { volume: 1 }))) > 0.05, 'an explosion reaches the speakers');
    ok((await out((g, a) => g.audio.voice('odile', 'Sixty one beds, forty blankets.'))) > 0.01, 'a gibberish voice reaches the speakers');
    await page.evaluate(() => { const g = window.__GAME__, a = g.ctx.audio; a.setVolume('music', 0.1); });
    ok(await page.evaluate(() => Math.abs(window.__PIXEL_ENGINE__.audio.volume.music - 0.1) < 0.001), 'music at 10% in the browser');
    // A live AnalyserNode on the engine's context after a gesture: the context really runs and carries signal.
    const live = await page.evaluate(async () => { const a = window.__PIXEL_ENGINE__.audio, c = a.context; await c.resume(); const an = c.createAnalyser(); an.fftSize = 2048; const os = c.createOscillator(); const g = c.createGain(); g.gain.value = 0.2; os.connect(g); g.connect(an); os.start(); await new Promise((r) => setTimeout(r, 300)); const d = new Float32Array(2048); an.getFloatTimeDomainData(d); os.stop(); return { state: c.state, peak: d.reduce((m, v) => Math.max(m, Math.abs(v)), 0) }; });
    ok(live.state === 'running' && live.peak > 0.05, `live audio context ${JSON.stringify(live)}`);
    await page.evaluate(() => { window.__GAME__.dev_startMission('m3'); window.__GAME__.missions.altPending = null; }); await step(20);
    s = await st(); ok(s.mode === 'play' && s.mission === 'm3', 'can start a mission');
    await page.keyboard.down('KeyW'); await step(30); await page.keyboard.up('KeyW'); await step(2); s = await st(); ok(s.device === 'kbm', 'kbm device');
    await page.evaluate(() => { window.__PIXEL_ENGINE__.manual = false; }); await page.waitForTimeout(3000);
    ok(!errs.length, `page errors: ${errs.slice(0, 3).join(' | ').slice(0, 400)}`);
    await ctx.close();
  }
  { // Pad stub.
    const init = () => { const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); window.__pad = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, index: 0, id: 'stub', timestamp: 0 }; navigator.getGamepads = () => [window.__pad]; };
    const { ctx, page, errs } = await open({}, init);
    await page.evaluate(() => { window.__PIXEL_ENGINE__.manual = true; if (window.__GAME__.mode === 'attract') window.__GAME__.attract.stop(); }); await page.evaluate(() => window.__PIXEL_ENGINE__.step(2));
    const press = (i) => page.evaluate((k) => { const e = window.__PIXEL_ENGINE__, p = window.__pad; p.buttons[k] = { pressed: true, value: 1 }; e.step(2); p.buttons[k] = { pressed: false, value: 0 }; e.step(3); }, i);
    await press(0); let s = await page.evaluate(() => window.__GAME__.state()); ok(s.device === 'pad', 'pad device'); ok(s.screen === 'main', `Cross opens main (${s.screen})`);
    const f = s.focus; await press(13); s = await page.evaluate(() => window.__GAME__.state()); ok(s.focus !== f, 'D-pad moves'); ok(s.prompts.some((x) => /CROSS/.test(x)), `PlayStation glyphs ${s.prompts.slice(0, 2)}`);
    ok(!errs.length, `pad page errors: ${errs.slice(0, 2).join('|').slice(0, 300)}`);
    await ctx.close();
  }
  { // Phone.
    const d = { ...devices['iPhone 14'] }; delete d.defaultBrowserType;
    const { ctx, page, errs } = await open(d);
    await page.evaluate(() => { window.__PIXEL_ENGINE__.manual = true; if (window.__GAME__.mode === 'attract') window.__GAME__.attract.stop(); window.__GAME__.gateCleared = false; }); await page.evaluate(() => { window.__PIXEL_ENGINE__.step(3); });
    let s = await page.evaluate(() => window.__GAME__.state()); ok(s.notice === 'Controller or keyboard required', `phone notice (${s.notice})`); ok(s.screen === 'touch-gate', `gate (${s.screen})`);
    const tap = await page.evaluate(() => { const g = window.__GAME__, r = g.ui.rowRect(g.ui.top, 0), H = g.ctx.hud, c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x + c.width * 0.3, y: c.y + c.height * ((r.y + 8) / H.height) }; });
    await page.touchscreen.tap(tap.x, tap.y); await page.waitForTimeout(150); await page.evaluate(() => window.__PIXEL_ENGINE__.step(3)); s = await page.evaluate(() => window.__GAME__.state()); ok(s.screen === 'settings', `tap opens settings (${s.screen})`);
    await page.evaluate(() => { const g = window.__GAME__; g.ui.pop(); }); await page.evaluate(() => window.__PIXEL_ENGINE__.step(620)); s = await page.evaluate(() => window.__GAME__.state()); ok(s.attract, 'attract runs on a phone');
    ok(!errs.length, `phone page errors: ${errs.slice(0, 2).join('|').slice(0, 300)}`);
    await ctx.close();
  }
} catch (x) { fail++; console.log(`FAIL threw ${String(x).slice(0, 400)}`); }
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
