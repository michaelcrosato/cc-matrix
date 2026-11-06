import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const here = dirname(fileURLToPath(import.meta.url));
export const dev = resolve(here, '..');
export const root = resolve(dev, '..');
export const STEM = basename(dev);
export const OUT = join(root, `${STEM}.html`);
export const FILE_URL = `file://${OUT}`;
export const RENDER = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-vulkan=swiftshader', '--use-angle=swiftshader'];
export const PAD_STUB = `
  window.__pads = window.__pads || [];
  navigator.getGamepads = () => window.__pads;
`;
/** The sim runs far faster than real time here, so sound nodes would pile up unplayed. Only the audio group needs sound. */
export const silence = (page) => page.evaluate(() => {
  const a = window.__TEST__.game.audio;
  a.sfx = () => {}; a.say = () => ({ duration: 0 }); a.sting = () => {}; a.music = () => {}; a.stopMusic = () => {};
});
export async function logicPage(browser, query = '', { init = '', sound = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/deprecated/i.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(PAD_STUB + init);
  await page.goto(`${FILE_URL}?test=1&render=0&manual=1${query}`);
  await page.waitForFunction(() => window.__TEST__ && !document.getElementById('boot'), null, { timeout: 60000 });
  page.errors = errors;
  if (!sound) await silence(page);
  return page;
}
export async function launch(args = []) { return chromium.launch({ args: ['--no-sandbox', ...args] }); }

/** Gigabytes of memory free right now. */
export function availableGB() {
  try { return +(readFileSync('/proc/meminfo', 'utf8').match(/MemAvailable:\s+(\d+)/)[1]) / 1048576; } catch (e) { return 99; }
}
/** This computer is shared, and earlyoom ends the biggest browser when memory runs out: wait for room first. */
export async function waitForRoom(gb = 3, maxMinutes = 40) {
  const t0 = Date.now();
  while (availableGB() < gb && Date.now() - t0 < maxMinutes * 60000) await new Promise((r) => { const t = globalThis.setTimeout; t(r, 15000); });
  return availableGB();
}
/** TASK.md: a crashed or closed browser means memory ran out, not a bug in the game. */
export const isMemoryCrash = (e) => /target crashed|page crashed|target closed|browser has been closed|has been closed/i.test(String(e && e.message));
