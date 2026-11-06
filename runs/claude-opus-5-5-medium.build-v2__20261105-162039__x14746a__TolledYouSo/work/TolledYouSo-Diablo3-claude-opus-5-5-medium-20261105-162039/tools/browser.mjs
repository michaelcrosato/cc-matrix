// Opens the deliverable in Chromium with the kit's WebGPU flags. Advances time with engine.step and reads frames.
import { chromium } from 'playwright';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
export const NAME = 'TolledYouSo-Diablo3-claude-opus-5-5-medium-20261105-162039';
export const HTML = resolve(here, '..', '..', `${NAME}.html`);
export const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--no-sandbox'];
export async function openGame({ width = 1920, height = 1080, init = null, query = '', context: ctxOpts = {} } = {}) {
  const browser = await chromium.launch({ args: FLAGS });
  const context = await browser.newContext({ viewport: { width, height }, ...ctxOpts });
  if (init) await context.addInitScript(init);
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(pathToFileURL(HTML).href + query);
  await page.waitForFunction(() => window.__PIXEL_READY__, null, { timeout: 60000 });
  await page.evaluate(async () => { const e = await window.__PIXEL_READY__; e.manual = true; window.E = e; window.G = window.__GAME__; });
  return { browser, context, page, errors };
}
// Steps n frames with keys held; returns state string.
export const step = (page, n = 1) => page.evaluate((k) => { window.E.step(k); return window.G.status(); }, n);
export async function shot(page, path, frames = 1) {
  // A manual engine draws nothing; let real frames run so the page shows the world, then freeze again.
  await page.evaluate(() => { window.E.manual = false; });
  await page.waitForTimeout(1200);
  await page.screenshot({ path });
  await page.evaluate(() => { window.E.manual = true; });
  void frames;
}
export const pressKey = async (page, code, hold = 3) => { await page.evaluate(([c, h]) => { const e = window.E; e.input.setKey(c, true); e.step(h); e.input.setKey(c, false); e.step(2); }, [code, hold]); };
