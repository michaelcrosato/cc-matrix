// Browser helpers: open the built game on file:// with the five WebGPU flags; capture a composited frame.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { FILE_BASE } from '../src/data/title.js';
export const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
export const GAME = new URL(`../${FILE_BASE}.html`, import.meta.url).pathname;
export async function openGame({ size = [1280, 720], url = GAME, query = '', init, context = {}, browser: br } = {}) {
  const browser = br ?? await chromium.launch({ headless: true, args: FLAGS });
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, ...context });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(pathToFileURL(url).href + query);
  await page.waitForFunction(() => window.__PIXEL_READY__ !== undefined, null, { timeout: 60000 }).catch(() => {});
  const ready = await page.evaluate(() => window.__PIXEL_READY__?.then(() => true, (e) => String(e))).catch((e) => String(e));
  return { browser, ctx, page, errors, ready };
}
export async function shot(page, path, frames = 30) {
  const data = await page.evaluate(async (n) => {
    const e = window.__PIXEL_ENGINE__; e.step(n);
    const f = await e.renderer.capture();
    const c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
    const g = c.getContext('2d'); g.putImageData(new ImageData(new Uint8ClampedArray(f.pixels), f.width, f.height), 0, 0);
    g.imageSmoothingEnabled = false; if (e.hud.canvas?.width) g.drawImage(e.hud.canvas, 0, 0, f.width, f.height);
    return c.toDataURL('image/png');
  }, frames);
  writeFileSync(path, Buffer.from(data.split(',')[1], 'base64'));
}
