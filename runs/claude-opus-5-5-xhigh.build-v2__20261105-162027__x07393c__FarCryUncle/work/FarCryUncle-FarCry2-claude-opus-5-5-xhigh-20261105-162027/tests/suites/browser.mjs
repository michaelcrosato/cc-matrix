// The built single file on file://, in one Chromium at 1920x1080: errors, backend, title, hover and click, pad, sound, phone gate.
import { launch } from '../lib/browser.mjs';
import { OUT } from '../lib/paths.mjs';
import { devices, webkit } from 'playwright';
export const name = 'browser';
export const covers = ['src', 'pixel-engine.js', 'vendor', 'tools/build.mjs'];
export const needsBuild = true;
const wait = (page) => page.waitForFunction(() => window.__GAME__ && window.__PIXEL_ENGINE__, null, { timeout: 180000 });
export async function run(t) {
  const browser = await launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    // Everything bound for the speakers also feeds an analyser we can read.
    await ctx.addInitScript(() => {
      const orig = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (dest, ...rest) {
        if (dest instanceof AudioDestinationNode) {
          const c = dest.context;
          if (!c.__tee) { c.__tee = c.createAnalyser(); c.__tee.fftSize = 2048; window.__tee = c.__tee; }
          orig.call(this, c.__tee);
        }
        return orig.call(this, dest, ...rest);
      };
    });
    const page = await ctx.newPage();
    const errs = [];
    const requests = [];
    page.on('request', (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.startsWith('blob:')) requests.push(u); });
    page.on('pageerror', (e) => errs.push(`pageerror ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`console ${m.text()}`); });
    await page.goto(`file://${OUT}`);
    await wait(page);
    const st0 = await page.evaluate(() => { const e = window.__PIXEL_ENGINE__; return { backend: e.state().backend, hub: !!(window.AIHub && window.AIHub.active), title: document.title }; });
    t.eq('backend WebGPU', st0.backend, 'WebGPU');
    t.eq('not in a session', st0.hub, false);
    t.eq('title', st0.title, 'Far Cry Uncle');
    const info = await page.evaluate(() => { const e = window.__PIXEL_ENGINE__, g = window.__GAME__; e.manual = true; e.step(200); return { screen: g.state().screen, music: e.audio.volume.music }; });
    t.eq('title reached', info.screen, 'title');
    t.near('music 10% on clean storage', info.music, 0.0999, 0.1001);
    // Into the main menu by a real key, then a real mouse.
    await page.keyboard.press('Enter');
    await page.evaluate(() => window.__PIXEL_ENGINE__.step(4));
    t.eq('real Enter', await page.evaluate(() => window.__GAME__.state().screen), 'main');
    const boxes = await page.evaluate(() => { const g = window.__GAME__, h = g.ctx.hud; const c = h.canvas.getBoundingClientRect(); return { regions: g.ui.menu.regions.filter((r) => r.index != null).map((r) => ({ i: r.index, x: c.left + ((r.x + r.w / 2) / h.width) * c.width, y: c.top + ((r.y + r.h / 2) / h.height) * c.height })) }; });
    const r2 = boxes.regions.find((r) => r.i === 1);
    await page.mouse.move(r2.x, r2.y); await page.waitForTimeout(100);
    await page.evaluate(() => window.__PIXEL_ENGINE__.step(4));
    t.eq('real mouse hover moves focus', await page.evaluate(() => window.__GAME__.state().focus), 1);
    await page.mouse.down(); await page.evaluate(() => window.__PIXEL_ENGINE__.step(1)); await page.mouse.up(); await page.evaluate(() => window.__PIXEL_ENGINE__.step(4));
    t.eq('real click activates', await page.evaluate(() => window.__GAME__.state().screen), 'cash');
    await page.keyboard.press('Escape'); await page.evaluate(() => window.__PIXEL_ENGINE__.step(4));
    // No pointer lock from menu clicks.
    t.eq('menu click did not lock the pointer', await page.evaluate(() => !!document.pointerLockElement), false);
    // Into play.
    await page.evaluate(() => { const g = window.__GAME__, e = window.__PIXEL_ENGINE__; g.dev.startMission('m3'); e.step(10); g.ui.menu.clear(); g.dialogue.stopAll(); e.step(10); });
    const walkFrom = await page.evaluate(() => { const f = window.__GAME__.player.feet; return [f.x, f.z]; });
    await page.keyboard.down('KeyW'); await page.evaluate(() => window.__PIXEL_ENGINE__.step(60)); await page.keyboard.up('KeyW');
    const walked = await page.evaluate(([x, z]) => { const f = window.__GAME__.player.feet; return Math.hypot(f.x - x, f.z - z); }, walkFrom);
    t.near('keyboard walks: W moves you at about run speed', walked, 2, 7);
    // A real click in play grabs the pointer; the mouse then looks around.
    await page.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.manual = false; });
    await page.waitForFunction(() => window.__GAME__.wantLock, null, { timeout: 60000, polling: 200 });
    await page.mouse.move(600, 500); await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(1500);
    const locked = await page.evaluate(() => !!document.pointerLockElement);
    t.ok('a click in play locks the pointer', locked);
    if (locked) {
      // Playwright's mouse reports no movement under pointer lock, so send what a real mouse sends: a move event with movementX and Y.
      // 200 px right and 40 px up, through the engine's own listener, at 0.0025 rad a pixel and sensitivity 1.
      const look = await page.evaluate(() => {
        const g = window.__GAME__, e = window.__PIXEL_ENGINE__; e.manual = true; e.step(2);
        const before = { yaw: g.ctx.camera.yaw, pitch: g.ctx.camera.pitch };
        document.pointerLockElement.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, movementX: 200, movementY: -40 }));
        e.step(2);
        return { dYaw: g.ctx.camera.yaw - before.yaw, dPitch: g.ctx.camera.pitch - before.pitch, follows: g.player.yaw === g.ctx.camera.yaw };
      });
      t.near('the mouse looks: left and right, by the right amount', look.dYaw, -0.51, -0.49);
      t.near('the mouse looks: up and down, by the right amount', look.dPitch, 0.09, 0.11);
      t.ok('and the player turns with the view', look.follows);
      await page.evaluate(() => { window.__PIXEL_ENGINE__.manual = false; });
      await page.waitForTimeout(300);
      await page.evaluate(() => document.exitPointerLock());
      await page.waitForTimeout(300);
      await page.evaluate(() => window.__PIXEL_ENGINE__.step(2));
      t.eq('losing the lock pauses', await page.evaluate(() => window.__GAME__.state().screen), 'pause');
      await page.evaluate(() => { const g = window.__GAME__; g.resume(); window.__PIXEL_ENGINE__.step(2); });
      // A pad that goes away during play opens the pause menu.
      await page.evaluate(() => { window.dispatchEvent(new Event('gamepaddisconnected')); window.__PIXEL_ENGINE__.step(2); });
      t.eq('a lost pad pauses', await page.evaluate(() => window.__GAME__.state().screen), 'pause');
      await page.evaluate(() => { const g = window.__GAME__; g.resume(); window.__PIXEL_ENGINE__.step(2); });
    }
    await page.evaluate(() => { window.__PIXEL_ENGINE__.manual = true; });
    // Sound: an analyser on the context after a real gesture.
    const sound = await page.evaluate(async () => {
      const e = window.__PIXEL_ENGINE__, a = e.audio;
      a.unlock();
      if (!a.context) return { ok: false, why: 'no context' };
      await a.context.resume();
      const OC = window.OfflineAudioContext;
      return { ok: true, state: a.context.state, offline: !!OC };
    });
    t.ok('audio context exists', sound.ok, sound.why);
    const off = await page.evaluate(async () => {
      const { SOUNDS } = window.__GAME__.sfx ? { SOUNDS: Object.fromEntries(window.__GAME__.ctx.audio.sounds) } : {};
      const a = window.__GAME__.ctx.audio;
      a.play('gun-tractor');
      return { n: a.sounds.size, counted: a.counts['gun-tractor'] };
    });
    const peak = await page.evaluate(async () => {
      const a = window.__GAME__.ctx.audio, tee = window.__tee;
      if (!tee) return { peak: -1, state: a.context?.state };
      const buf = new Float32Array(tee.fftSize);
      let best = 0;
      for (let i = 0; i < 40; i++) {
        if (i % 8 === 0) a.play('explosion');
        await new Promise((r) => setTimeout(r, 25));
        tee.getFloatTimeDomainData(buf);
        for (const v of buf) best = Math.max(best, Math.abs(v));
      }
      return { peak: best, state: a.context.state, song: a.playing };
    });
    t.ok('real sound reaches the speakers', peak.peak > 0.02, JSON.stringify(peak));
    t.ok('the sounds registered', off.n > 70);
    t.ok('sound plays', off.counted >= 1);
    // Let a few real frames draw.
    await page.evaluate(() => { window.__PIXEL_ENGINE__.manual = false; });
    await page.waitForTimeout(6000);
    const st1 = await page.evaluate(() => { const e = window.__PIXEL_ENGINE__; return { errors: e.errors.slice(0, 3), gpu: e.state().gpuErrors.slice(0, 3) }; });
    t.eq('no game errors', st1.errors.length, 0, st1.errors[0]);
    t.eq('no GPU errors', st1.gpu.length, 0, st1.gpu[0]);
    t.ok('no page or console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
    t.ok('nothing but the file itself is loaded', requests.every((u) => u === `file://${OUT}`), requests.filter((u) => u !== `file://${OUT}`).slice(0, 3).join(' '));
    await ctx.close();
    // A pad stub through addInitScript.
    const ctxP = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctxP.addInitScript(() => {
      const pad = { id: 'stub', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), timestamp: 0 };
      window.__pad = pad;
      navigator.getGamepads = () => [pad];
    });
    const pP = await ctxP.newPage();
    await pP.goto(`file://${OUT}`);
    await wait(pP);
    const padRes = await pP.evaluate(() => {
      const e = window.__PIXEL_ENGINE__, g = window.__GAME__, pad = window.__pad;
      e.manual = true; e.step(200);
      pad.buttons[0].pressed = true; pad.buttons[0].value = 1; e.step(2); pad.buttons[0].pressed = false; pad.buttons[0].value = 0; e.step(2);
      return { screen: g.state().screen, device: g.state().device };
    });
    t.eq('pad stub confirms', padRes.screen, 'main');
    t.eq('pad device', padRes.device, 'pad');
    await ctxP.close();
    // A phone profile in Chromium.
    const { defaultBrowserType, ...iphone } = devices['iPhone 14'];
    const ctxT = await browser.newContext({ ...iphone });
    const pT = await ctxT.newPage();
    const touchErrs = [];
    pT.on('pageerror', (e) => touchErrs.push(e.message));
    await pT.goto(`file://${OUT}`);
    await wait(pT);
    const gate = await pT.evaluate(() => { const e = window.__PIXEL_ENGINE__, g = window.__GAME__; e.manual = true; e.step(200); const h = g.ctx.hud, c = h.canvas.getBoundingClientRect(), r = g.ui.menu.regions.find((q) => q.index === 0); return { s: g.state(), x: c.left + ((r.x + r.w / 2) / h.width) * c.width, y: c.top + ((r.y + r.h / 2) / h.height) * c.height }; });
    t.eq('phone: gate', gate.s.screen, 'gate');
    t.eq('phone: notice', gate.s.notice, 'Controller or keyboard required');
    await pT.touchscreen.tap(gate.x, gate.y);
    await pT.waitForTimeout(150);
    await pT.evaluate(() => window.__PIXEL_ENGINE__.step(4));
    t.eq('phone: tap opens Settings', await pT.evaluate(() => window.__GAME__.state().screen), 'settings');
    await pT.evaluate(() => { const g = window.__GAME__; g.ui.menu.pop(); window.__PIXEL_ENGINE__.step(620); });
    t.ok('phone: attract runs', await pT.evaluate(() => window.__GAME__.state().attract));
    t.ok('phone: no page errors', touchErrs.length === 0, touchErrs[0]);
    await ctxT.close();
    // The tablet and the other phone profile the plan names.
    for (const name of ['iPad Pro 11', 'Pixel 7']) {
      const { defaultBrowserType: _, ...profile } = devices[name];
      const ctxO = await browser.newContext({ ...profile });
      const pO = await ctxO.newPage();
      await pO.goto(`file://${OUT}${name === 'Pixel 7' ? '?seed=77' : ''}`);
      await wait(pO);
      if (name === 'Pixel 7') {
        const eng = await pO.evaluate(() => { const e = window.__PIXEL_ENGINE__; return { seed: e.state().seed, keys: JSON.stringify(e.debugKeys ?? {}) }; });
        t.eq('the ?seed= review flag works', eng.seed, 77);
        t.ok('the engine\'s R, P and M hotkeys are off', !/Key[RPM]/.test(eng.keys), eng.keys);
      }
      const s = await pO.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.manual = true; e.step(200); return window.__GAME__.state(); });
      t.eq(`${name}: gate`, s.screen, 'gate');
      t.eq(`${name}: notice`, s.notice, 'Controller or keyboard required');
      await ctxO.close();
    }
  } finally { await browser.close(); }
  // WebKit with an iPhone profile, the closest thing here to iOS Safari. The engine needs WebGPU, so it may refuse politely.
  const wk = await webkit.launch();
  try {
    const { defaultBrowserType, ...iphone } = devices['iPhone 14'];
    const ctxW = await wk.newContext({ ...iphone });
    const pW = await ctxW.newPage();
    const uncaught = [];
    pW.on('pageerror', (e) => uncaught.push(e.message));
    await pW.goto(`file://${OUT}`);
    const res = await pW.waitForFunction(() => { const t = document.body.innerText || ''; return window.__GAME__ ? 'game' : (/webgpu/i.test(t) ? 'refused' : null); }, null, { timeout: 90000, polling: 500 }).then((h) => h.jsonValue()).catch(() => 'nothing');
    t.ok('WebKit iPhone: the game runs or says why it cannot', res === 'game' || res === 'refused', res);
    if (res === 'game') t.eq('WebKit iPhone: the gate', await pW.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.manual = true; e.step(200); return window.__GAME__.state().screen; }), 'gate');
    t.ok('WebKit iPhone: nothing uncaught', uncaught.length === 0, uncaught[0]);
    await ctxW.close();
  } finally { await wk.close(); }
}
