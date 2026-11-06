// Shared browser helpers for tests: kit flags, file:// open, step/capture helpers.
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FILE_STEM } from '../src/data/meta.js';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const HTML = join(ROOT, '..', FILE_STEM + '.html');
export const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist'];
export async function launch(opts = {}) { return chromium.launch({ headless: true, args: FLAGS, ...opts }); }
export async function openGame(browser, { url = pathToFileURL(HTML).href, viewport = { width: 1280, height: 720 }, init, ctxOpts = {} } = {}) {
  const context = await browser.newContext({ viewport, ...ctxOpts });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__PIXEL_READY__ !== undefined, null, { timeout: 60000 });
  await page.evaluate(async () => { await window.__PIXEL_READY__; });
  return { page, context, errors };
}
