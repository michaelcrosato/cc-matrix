// Shared browser launcher for tests and shots: the kit's flags, one page, file:// or a given URL.
import { chromium } from 'playwright';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STEM = DEV.split('/').pop();
export const HTML = resolve(DEV, '..', `${STEM}.html`);
export const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];

export async function launch() {
  return chromium.launch({ headless: true, args: FLAGS });
}

/** Opens the deliverable; returns { browser, context, page, errors }. Waits for the engine to be ready. */
export async function openGame({ url = 'file://' + HTML, width = 1280, height = 720, init = null, contextOptions = {}, browser = null, query = '' } = {}) {
  const b = browser ?? (await launch());
  const context = await b.newContext({ viewport: { width, height }, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  if (process.env.TRACE_ERRORS) await page.addInitScript(() => { const o = console.error; console.error = (...a) => { o(...a); o(new Error('trace').stack.slice(0, 900)); }; });
  if (init) await page.addInitScript(init);
  await page.goto(url + query);
  await page.waitForFunction(() => window.__PIXEL_READY__, null, { timeout: 60000 });
  await page.evaluate(() => window.__PIXEL_READY__);
  return { browser: b, context, page, errors };
}
