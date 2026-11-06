// Browser helpers: one Chromium with software WebGPU, from file:// by default.
import { chromium } from 'playwright';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const GAME_URL = `file://${join(ROOT, 'dist', 'game.html')}`;
export const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'];

export async function launch(extra = []) {
  return chromium.launch({ headless: true, args: [...ARGS, ...extra] });
}
export async function openGame(browser, query = '', o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport ?? { width: 960, height: 540 }, ...(o.context ?? {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  if (o.init) await page.addInitScript(o.init);
  await page.goto(`${o.url ?? GAME_URL}${query}`);
  await page.waitForFunction(() => window.__PIXEL_READY__, null, { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => window.__PIXEL_READY__);
  return { page, ctx, errors };
}
export const PAD_STUB = `
window.__pad = { connected:true, mapping:'standard', index:0, id:'stub', axes:[0,0,0,0], buttons:Array.from({length:17},()=>({pressed:false,value:0})), vibrationActuator:{ playEffect:()=>{window.__rumbles=(window.__rumbles||0)+1;return Promise.resolve('complete');} } };
navigator.getGamepads = () => [window.__pad, window.__pad2 ?? null, null, null];
`;
