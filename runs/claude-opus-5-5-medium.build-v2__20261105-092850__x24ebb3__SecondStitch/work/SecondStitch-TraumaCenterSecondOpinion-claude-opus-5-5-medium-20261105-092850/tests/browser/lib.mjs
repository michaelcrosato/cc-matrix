import { chromium, devices } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
export const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required', '--no-sandbox'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const pageUrl = (q = '') => `${pathToFileURL(path.join(root, 'dist/game.html')).href}${q}`;
export async function launch() { return chromium.launch({ args: ARGS }); }
export { devices };
export const PAD_STUB = `(() => {
  const mk = (i) => ({ connected: true, mapping: 'standard', index: i, id: 'stub' + i, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect: (...a) => { window.__rumble = (window.__rumble || 0) + 1; return Promise.resolve('complete'); } } });
  window.__pads = [mk(0), mk(1)];
  window.__padsOn = 0;
  navigator.getGamepads = () => [window.__padsOn > 0 ? window.__pads[0] : null, window.__padsOn > 1 ? window.__pads[1] : null, null, null];
  window.__press = (p, b, v = 1) => { window.__pads[p].buttons[b] = { pressed: v > 0.5, value: v }; };
})()`;
export async function open(browser, q = '', { viewport = { width: 960, height: 540 }, init = null, context = null } = {}) {
  const ctx = context ?? (await browser.newContext({ viewport }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  if (init) await page.addInitScript(init);
  await page.goto(pageUrl(q));
  await page.waitForFunction(() => window.__PIXEL_READY__ !== undefined, null, { timeout: 60000 });
  await page.evaluate(() => window.__PIXEL_READY__);
  return { page, errors, ctx };
}
export const engineErrors = (page) => page.evaluate(() => { const e = window.__PIXEL_ENGINE__; return [...(e?.errors ?? []), ...(e?.renderer?.gpuErrors ?? []).map((x) => x.message ?? String(x))]; });

/** A key press that spans whole frames: software WebGPU can run at 5 fps. */
const frames = (page, n) => page.waitForFunction(([f, k]) => window.__PIXEL_ENGINE__.frame >= f + k, [0, 0]).then(async () => { const f = await page.evaluate(() => window.__PIXEL_ENGINE__.frame); await page.waitForFunction(([a, k]) => window.__PIXEL_ENGINE__.frame >= a + k, [f, n], { polling: 30 }); });
export async function tap(page, key) { await page.keyboard.down(key); await frames(page, 2); await page.keyboard.up(key); await frames(page, 2); }
export const waitFrames = frames;
