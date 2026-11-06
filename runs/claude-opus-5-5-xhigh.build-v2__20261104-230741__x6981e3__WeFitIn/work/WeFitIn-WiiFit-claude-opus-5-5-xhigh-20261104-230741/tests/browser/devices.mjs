// 16 touch-only phones, 20 browsers without WebGPU.
import { assert, done, eq, test } from '../lib-pure.mjs';
import { devices, firefox, webkit } from 'playwright';
import { bootPage, FILE_URL, launch, serveHarness } from './_lib.mjs';

/** Wait in frames, not milliseconds: a software-rendered frame on a shared machine can take a while. */
async function frames(p, n = 6) {
  const start = await p.evaluate(() => window.__PIXEL_ENGINE__.frame);
  await p.waitForFunction(([a, b]) => window.__PIXEL_ENGINE__.frame >= a + b, [start, n], { timeout: 60000 });
}

await test('16 phone with touch: message showing, gear present, engine.touch null, attract runs and a tap returns', async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] }); // portrait, touch, no hover
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await bootPage(p);
  const s = await p.evaluate(() => {
    const G = window.__GAME__, e = window.__PIXEL_ENGINE__;
    return { touchOnly: G.touchOnly, touch: e.touch, msg: G.scene.touchMessage, scene: G.scene.id, width: e.hud.width };
  });
  eq(s.touchOnly, true, 'touch-only detected');
  eq(s.touch, null, 'no touch controls');
  eq(s.msg, true, 'message showing');
  eq(s.scene, 'title');
  const gear = await p.evaluate(() => [...document.querySelectorAll('button, [role=button], div')].some((b) => /⚙/.test(b.textContent ?? '') && b.children.length === 0));
  assert(gear, 'the settings button is present');
  // The message fits, even on a narrow portrait art size.
  await p.evaluate(() => { window.__GAME__.layout.record = true; });
  await frames(p);
  const fits = await p.evaluate(() => {
    const G = window.__GAME__; const h = G.engine.hud;
    const lines = G.layout.rects.filter((r) => r.name === 'touch-message');
    return { w: h.width, lines: lines.length, bad: lines.filter((r) => r.x < 0 || r.x + r.w > h.width).length, text: lines.map((r) => r.text).join(' ') };
  });
  assert(fits.lines >= 1, 'the message is drawn');
  eq(fits.text, 'Controller or keyboard required', 'the words');
  eq(fits.bad, 0, `fits in ${fits.w}`);
  // A tap on the screen stays on the title, with the message, and restarts the timer.
  await p.touchscreen.tap(100, 300);
  await frames(p);
  eq(await p.evaluate(() => window.__GAME__.stack.names().length), 0, 'no menu opens');
  eq(await p.evaluate(() => window.__GAME__.scene.touchMessage), true);
  assert(await p.evaluate(() => window.__GAME__.scene.idle < 3), 'timer restarted');
  // Attract runs and loops.
  await p.evaluate(() => { window.__GAME__.scene.idle = 9.9; });
  await p.waitForFunction(() => !!window.__GAME__.attract, null, { timeout: 15000 });
  await p.waitForFunction(() => !window.__GAME__.loading && window.__GAME__.scene.id === 'hub', null, { timeout: 40000 });
  await p.touchscreen.tap(100, 300);
  await p.waitForFunction(() => !window.__GAME__.attract, null, { timeout: 10000 });
  await p.waitForFunction(() => !window.__GAME__.loading && window.__GAME__.scene.id === 'title', null, { timeout: 40000 });
  eq(await p.evaluate(() => window.__GAME__.scene.touchMessage), true, 'back to the message');
  // A key press drops the message and plays normally.
  await p.keyboard.press('Enter');
  await frames(p);
  eq(await p.evaluate(() => window.__GAME__.scene.touchMessage), false);
  eq(await p.evaluate(() => window.__GAME__.stack.names().join()), 'main');
  eq(errors.length, 0, errors.join(' | '));
  await browser.close();
});
await test('16 a pad connecting on a touch device drops the message and plays normally', async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const p = await ctx.newPage();
  await bootPage(p);
  eq(await p.evaluate(() => window.__GAME__.scene.touchMessage), true);
  await p.evaluate(() => {
    window.__pad = { id: 'Stub', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    navigator.getGamepads = () => [window.__pad, null, null, null];
  });
  await frames(p);
  eq(await p.evaluate(() => window.__GAME__.scene.touchMessage), false, 'message gone');
  await p.evaluate(() => { window.__pad.buttons[0].pressed = true; });
  await frames(p, 3);
  await p.evaluate(() => { window.__pad.buttons[0].pressed = false; });
  await frames(p, 3);
  eq(await p.evaluate(() => window.__GAME__.stack.names().join()), 'main', 'the pad plays');
  await browser.close();
});
for (const [name, type, profile] of [['WebKit iPhone', webkit, devices['iPhone 15']], ['Firefox', firefox, {}]]) {
  await test(`20 ${name}: no navigator.gpu here, so the engine's message shows, and no page error`, async () => {
    const browser = await type.launch();
    const ctx = await browser.newContext(profile);
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(FILE_URL);
    const hasGpu = await p.evaluate(() => !!navigator.gpu);
    if (!hasGpu) {
      await p.waitForFunction(() => /Failed to start: WebGPU unavailable/.test(document.body.innerText), null, { timeout: 60000 });
      await p.waitForTimeout(500);
      eq(errors.length, 0, errors.join(' | '));
    }
    await browser.close();
  });
}
for (const [name, type] of [['Firefox', firefox], ['WebKit', webkit]]) {
  await test(`20 ${name} in a session without WebGPU: the game tells the hub, and the round voids instead of hanging`, async () => {
    const server = await serveHarness();
    const browser = await type.launch();
    const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    await p.goto(`http://127.0.0.1:${server.port}/harness.html?game=game.html&auto=1&players=1`);
    await p.waitForFunction(() => (window.__hubCheck?.log ?? []).some((l) => /void/.test(l)), null, { timeout: 60000 });
    const log = await p.evaluate(() => window.__hubCheck.log.join(' | '));
    await browser.close();
    server.stop();
    assert(/round 1 void: no-players/.test(log), log.slice(0, 300));
  });
}
done();
