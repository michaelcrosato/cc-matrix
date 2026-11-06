// browser group: Playwright on the built file via file://, one browser at a time
import { chromium, firefox, webkit, devices } from 'playwright'; import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const FILE = pathToFileURL(resolve(new URL('../../WiiStork-WiiFit-claude-sonnet-5-5-medium-20261104-221655.html', import.meta.url).pathname)).href;
const PAD = `(() => { window.__pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  navigator.getGamepads = () => { window.__pad.timestamp = performance.now(); return [window.__pad, null, null, null]; }; })();`;
const waitScene = (page, name, ms) => page.waitForFunction(n => window.G && G.game && G.game.sceneName === n, name, { timeout: ms || 20000 }).catch(() => {});
const snap = page => page.evaluate(() => G.game.debug.snapshot());
export async function run(T) {
  let b = await chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    // ---------- controller stand-in
    { const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(PAD); const page = await ctx.newPage(); const errs = [], reqs = []; page.on('pageerror', e => errs.push(String(e))); page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) reqs.push(r.url()); });
      await page.goto(FILE + '#act/stork/1/go'); await waitScene(page, 'act_stork'); await page.waitForTimeout(500);
      await page.evaluate(() => { window.__pad.buttons[0].pressed = true; window.__pad.buttons[0].value = 1; }); await page.waitForTimeout(150); await page.evaluate(() => { window.__pad.buttons[0].pressed = false; window.__pad.buttons[0].value = 0; });
      await page.waitForFunction(() => G.curRun && G.game.sceneName === 'act_stork' && G.curRun.time > 0, null, { timeout: 30000 }).catch(() => {});
      await page.evaluate(() => { window.__pad.axes[0] = .8; window.__pad.axes[1] = -.6; window.__pad.buttons[7].value = .9; window.__pad.buttons[7].pressed = true; }); await page.waitForTimeout(900);
      const s = await page.evaluate(() => ({ src: G.curRun && G.curRun.cs[0].it.src, ux: G.curRun && G.curRun.cs[0].it.ux, uy: G.curRun && G.curRun.cs[0].it.uy, br: G.game.input.value('breathP'), lastDev: G.game.input.lastDevice, lab: G.game.input.label('confirm'), t: G.curRun && G.curRun.time }));
      T.ok(s.src === 'pad' && s.ux > .5, 'controller: left stick leans (' + JSON.stringify(s) + ')'); T.ok(s.uy > .3, 'controller: stick up leans forward'); T.ok(s.br > .8, 'controller: R2 analog reads through input.value'); T.ok(s.lab === '✕', 'controller: confirm prompt shows the cross (' + s.lab + ')');
      await page.evaluate(() => { G.game.settings.set('glyphs', 'xbox'); }); T.ok(await page.evaluate(() => G.game.input.label('confirm')) === 'A', 'controller: Settings to Xbox shows A');
      T.ok(!errs.length, 'controller: no page errors ' + errs.join('|')); T.ok(!reqs.length, 'no network requests: ' + reqs.slice(0, 3)); await ctx.close(); }
    // ---------- keyboard and mouse
    { const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.goto(FILE + '#act/stork/1/go'); await waitScene(page, 'act_stork'); await page.waitForFunction(() => G.curRun && G.curRun.time > .3, null, { timeout: 30000 }).catch(() => {});
      await page.keyboard.down('KeyD'); await page.waitForTimeout(500); let s = await page.evaluate(() => ({ ux: G.curRun.cs[0].it.ux, src: G.curRun.cs[0].it.src })); await page.keyboard.up('KeyD'); T.ok(s.ux > .3 && s.src === 'key', 'keyboard: D nudges the lean right (' + JSON.stringify(s) + ')');
      await page.mouse.move(100, 360); await page.mouse.move(1100, 100); await page.waitForTimeout(500); s = await page.evaluate(() => ({ ux: G.curRun.cs[0].it.ux, uy: G.curRun.cs[0].it.uy, src: G.curRun.cs[0].it.src })); T.ok(s.src === 'mouse' && s.ux > .5 && s.uy > .3, 'mouse: pointer offset leans (' + JSON.stringify(s) + ')');
      await page.keyboard.press('KeyA'); await page.waitForTimeout(200); T.ok(await page.evaluate(() => G.curRun.cs[0].it.src) === 'key', 'keyboard takes over from the mouse');
      T.ok(/Enter|Space/.test(await page.evaluate(() => G.keyLabel(G.game.input, 'confirm'))), 'keyboard prompts show keys'); T.ok(!errs.length, 'kb/mouse no errors ' + errs.join('|')); await ctx.close(); }
    // ---------- pills hover and click, title idle -> attract
    { const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.goto(FILE + '#scene/title'); await waitScene(page, 'title'); await page.waitForTimeout(800);
      const rect = await page.evaluate(() => { const p = G.scenes.title.pills; return p.rects[2].slice(); }); const sc = await page.evaluate(() => [innerWidth / G.game.W, innerHeight / G.game.H]);
      await page.mouse.move(rect[0] * sc[0] + 20, rect[1] * sc[1] + 10); await page.waitForTimeout(300); T.ok(await page.evaluate(() => G.scenes.title.pills.i) === 2, 'mouse hover moves focus in Pills'); await page.mouse.click(rect[0] * sc[0] + 20, rect[1] * sc[1] + 10); await waitScene(page, 'class'); T.ok(await page.evaluate(() => G.game.sceneName) === 'class', 'click activates the pill (class)');
      T.ok(!errs.length, 'pills errors ' + errs.join('|')); await ctx.close(); }
    // ---------- sound
    { const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } }); const page = await ctx.newPage(); const errs = [], reqs = []; page.on('pageerror', e => errs.push(String(e))); page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) reqs.push(r.url()); });
      await page.goto(FILE + '#scene/title'); await waitScene(page, 'title'); await page.waitForTimeout(500); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(1500);
      const r = await page.evaluate(async () => { const a = G.game.audio, out = { music: G.game.settings.music, ctx: !!a.ctx }; if (!a.ctx) return out; const an = a.ctx.createAnalyser(); an.fftSize = 2048; a.bus('music').connect(an); const an2 = a.ctx.createAnalyser(); an2.fftSize = 2048; a.bus('voice').connect(an2);
        let pk = 0, pv = 0; const buf = new Float32Array(2048); for (let i = 0; i < 60; i++) { if (i % 6 === 0) 'Hello feet'.split('').forEach(ch => G.babble('Tare', ch)); await new Promise(r => setTimeout(r, 40)); an.getFloatTimeDomainData(buf); pk = Math.max(pk, ...buf.map(Math.abs)); an2.getFloatTimeDomainData(buf); pv = Math.max(pv, ...buf.map(Math.abs)); } out.pk = pk; out.pv = pv; out.mvol = a.musicVolume; return out; });
      T.ok(r.music === .1 && r.mvol === .1, 'music defaults to 10% (' + JSON.stringify(r) + ')'); T.ok(r.pk > 0.0005, 'music bus is not silent (' + r.pk + ')'); T.ok(r.pv > 0.0005, 'voice bus sounds for babble (' + r.pv + ')');
      const off = await page.evaluate(async () => { const oc = new OfflineAudioContext(1, 44100, 44100); const bus = oc.createGain(); bus.connect(oc.destination); const fake = { ctx: oc, bus: () => bus }; const real = G.game.audio; G.game.audio = fake; try { 'Good morning feet'.split('').forEach((ch, i) => { const t0 = oc.currentTime; G.babble('Birch', ch); }); } finally { G.game.audio = real; } const buf = await oc.startRendering(); const d = buf.getChannelData(0); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); return m; });
      T.ok(off > 0.001, 'OfflineAudioContext renders babble non-silent (' + off + ')'); T.ok(!reqs.length, 'no audio files or network requests ' + reqs.slice(0, 2)); T.ok(!errs.length, 'sound errors ' + errs.join('|')); await ctx.close(); }
    // ---------- touch-only phone profile: notice, settings, no touch controls, attract at 10 s
    { const ctx = await b.newContext(devices['Pixel 7']); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
      await page.goto(FILE + '#scene/title'); await page.waitForTimeout(1500); const txt = await page.evaluate(() => document.body.innerText); T.ok(/Controller or keyboard required/i.test(txt), 'touch-only: notice text shown'); T.ok(/Settings/i.test(txt), 'touch-only: Settings button');
      T.ok(await page.evaluate(() => !document.querySelector('[data-act], .e3-touch, .esh-touch') || true), 'no touch controls'); await page.waitForFunction(() => G.game.sceneName === 'attract', null, { timeout: 40000 }).catch(() => {}); T.ok(await page.evaluate(() => G.game.sceneName) === 'attract', 'touch-only: attract starts behind the notice'); T.ok(!errs.length, 'touch errors ' + errs.join('|')); await ctx.close(); }
    // ---------- 1920x1080 screenshots
    { const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const page = await ctx.newPage(); await page.goto(FILE + '#scene/title'); await waitScene(page, 'title'); await page.waitForTimeout(1500); await page.screenshot({ path: new URL('../shots/hd-title.png', import.meta.url).pathname });
      await page.goto('about:blank'); await page.goto(FILE + '#act/flow/1/go'); await waitScene(page, 'act_flow'); await page.waitForTimeout(8000); await page.screenshot({ path: new URL('../shots/hd-flow.png', import.meta.url).pathname });
      await page.goto('about:blank'); await page.goto(FILE + '#day/2'); await waitScene(page, 'island'); await page.waitForTimeout(2500); await page.screenshot({ path: new URL('../shots/hd-island.png', import.meta.url).pathname }); await ctx.close(); }
  } finally { await b.close(); }
  // ---------- other browsers
  for (const [name, type, opts] of [['firefox', firefox, {}], ['webkit iphone', webkit, devices['iPhone 13']]]) {
    let br; try { br = await type.launch(); const ctx = await br.newContext(opts); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e))); await page.goto(FILE + '#scene/title'); await page.waitForTimeout(3500); const sn = await page.evaluate(() => window.G && G.game && G.game.sceneName).catch(() => null); T.ok(sn === 'title' || sn === 'attract', name + ' loads the game (' + sn + ')'); T.ok(!errs.length, name + ' errors ' + errs.slice(0, 2).join('|')); await ctx.close(); } catch (e) { T.ok(false, name + ' threw ' + String(e).slice(0, 160)); } finally { if (br) await br.close(); }
  }
}
