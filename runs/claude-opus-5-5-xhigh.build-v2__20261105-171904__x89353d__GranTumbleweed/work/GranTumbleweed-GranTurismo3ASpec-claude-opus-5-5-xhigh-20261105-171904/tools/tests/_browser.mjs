// Playwright against the built HTML. WebGPU on software; one or two browsers at a time.
import { chromium } from 'playwright';
export const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--mute-audio', '--autoplay-policy=no-user-gesture-required'];
export const launch = () => chromium.launch({ headless: true, args: ARGS });
export const HTML = process.env.GAME_HTML;
// A pad in the standard mapping, as an init script. window.__pad(i, {axes, buttons}) changes it.
export const PAD_STUB = `(() => { const mk = (i) => ({ index: i, id: 'Stub Pad ' + i, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) }); const pads = [null, null]; window.__padCount = (n) => { for (let i = 0; i < 2; i++) pads[i] = i < n ? (pads[i] ?? mk(i)) : null; }; window.__pad = (i, b, v = 1) => { const p = pads[i]; if (!p) return; p.buttons[b] = { pressed: v > 0.5, touched: v > 0, value: v }; }; window.__axis = (i, a, v) => { const p = pads[i]; if (p) p.axes[a] = v; }; navigator.getGamepads = () => pads; })();`;
export async function open(browser, { query = '', context = {}, init = null, viewport = { width: 1280, height: 720 } } = {}) {
  const ctx = await browser.newContext({ viewport, ...context }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(`page: ${String(e).slice(0, 300)}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`); });
  if (init) await page.addInitScript(init);
  await page.goto(`file://${HTML}${query}`);
  await page.waitForFunction(() => window.__GAME__ !== undefined, null, { timeout: 90000 });
  return { page, ctx, errors };
}
export const state = (page) => page.evaluate(() => window.__GAME__.state());
// Runs the page's engine for n frames of manual time, then hands it back to the render loop.
export const step = (page, n = 10) => page.evaluate((k) => { const e = window.__PIXEL_ENGINE__; e.step(k); e.manual = false; }, n);
export async function waitFor(page, fn, arg, timeout = 30000) { await page.waitForFunction(fn, arg, { timeout, polling: 100 }); }
export const pressPad = async (page, b, hold = 120) => { await page.evaluate((x) => window.__pad(0, x, 1), b); await page.waitForTimeout(hold); await page.evaluate((x) => window.__pad(0, x, 0), b); await page.waitForTimeout(hold); };
