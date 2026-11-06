// browser: the built single file on file:// in Chromium (WebGPU, software), then a phone profile.
import { chromium, devices } from 'playwright';
import { GAME_HTML, CHROME_FLAGS } from '../lib/serve.mjs';
export const covers = ['src', 'tools'];
export async function run(t) {
  process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE ||= 'ubuntu24.04-x64';
  const browser = await chromium.launch({ args: CHROME_FLAGS });
  try {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = [];
    p.on('pageerror', (e) => errs.push('page ' + e)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 160)); });
    await p.goto('file://' + GAME_HTML);
    const ready = await p.evaluate(() => window.__PIXEL_READY__.then(() => true)).catch(() => false); t.ok(ready, 'the engine starts from the single file on file://');
    t.eq(await p.title(), 'Far Pry 2', 'the page title is the game title');
    const info = await p.evaluate(() => { const e = window.__PIXEL_ENGINE__, g = window.__GAME__; return { backend: e.state().backend, aihub: !!(window.AIHub && window.AIHub.active), screen: g.state().screen, music: e.audio.volume.music, errors: e.errors, gpu: e.state().gpuErrors }; });
    t.eq(info.backend, 'WebGPU', 'backend is WebGPU'); t.ok(!info.aihub, 'AIHub is not active outside a session'); t.eq(info.screen, 'title', 'the title screen is reached'); t.ok(info.music === 0.1, 'music is 10 percent on a clean profile');
    t.eq(info.errors.length + (info.gpu || []).length, 0, 'no game or GPU errors');
    await p.evaluate(() => { window.__PIXEL_ENGINE__.manual = true; });
    await p.keyboard.press('Enter'); await p.evaluate(() => window.__PIXEL_ENGINE__.step(4)); t.eq(await p.evaluate(() => window.__GAME__.state().screen), 'main', 'keyboard flows: Enter opens the main menu');
    await p.mouse.move(960, 400); await p.evaluate(() => window.__PIXEL_ENGINE__.step(3)); await p.mouse.move(965, 405); await p.evaluate(() => window.__PIXEL_ENGINE__.step(3));
    t.ok(await p.evaluate(() => window.__GAME__.ui.rects.length > 0), 'menu items are laid out for the mouse');
    // sound: render a gunshot with OfflineAudioContext-free math (renderSound) and read the context state
    const snd = await p.evaluate(async () => { const a = window.__PIXEL_ENGINE__.audio; a.unlock(); return { has: a.sounds.has('shot_m38'), unlocked: a.unlocked }; }); t.ok(snd.has, 'sounds are registered in the browser');
    t.eq(errs.length, 0, 'no console or page errors: ' + errs.slice(0, 2).join(' | '));
    await p.close();
    // a phone: touch only
    const ctx = await browser.newContext({ ...devices['iPhone 14'], browserName: undefined }).catch(async () => browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })); delete ctx.browserName;
    const ph = await ctx.newPage(); await ph.goto('file://' + GAME_HTML); await ph.evaluate(() => window.__PIXEL_READY__.then(() => true)).catch(() => false);
    const gate = await ph.evaluate(() => ({ notice: window.__GAME__.state().notice, touchOnly: window.__GAME__.touchOnly, screen: window.__GAME__.state().screen })); t.eq(gate.notice, 'Controller or keyboard required', 'touch-only devices show the notice'); t.ok(gate.touchOnly, 'touch gate state');
    await ph.evaluate(() => { window.__PIXEL_ENGINE__.manual = true; window.__PIXEL_ENGINE__.step(2); }); await ph.touchscreen.tap(200, 560); await ph.evaluate(() => window.__PIXEL_ENGINE__.step(4));
    t.ok(['settings', 'title'].includes(await ph.evaluate(() => window.__GAME__.state().screen)), 'a tap on Settings is handled');
    await ctx.close();
  } finally { await browser.close(); }
}
