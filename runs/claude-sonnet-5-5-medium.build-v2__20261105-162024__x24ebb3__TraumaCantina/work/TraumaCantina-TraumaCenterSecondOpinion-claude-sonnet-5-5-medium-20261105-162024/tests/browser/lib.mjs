import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required', '--no-sandbox'];
export async function launch(opts = {}) {
  const browser = await chromium.launch({ headless: true, args: ARGS });
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 960, height: 540 }, ...(opts.context || {}) });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  return { browser, ctx, page, errs };
}
export const PADSTUB = `window.__pad = { connected:true, mapping:'standard', index:0, id:'stub', axes:[0,0,0,0], buttons:Array.from({length:17},()=>({pressed:false,value:0})), vibrationActuator:{ playEffect:()=>Promise.resolve('complete') } }; navigator.getGamepads = () => [window.__pad, null, null, null];`;
export async function waitReady(page, ms = 60000) { await page.waitForFunction(() => window.__PIXEL_ENGINE__ && window.__GAME__ && window.__PIXEL_ENGINE__.state, null, { timeout: ms }); }
export const state = (page) => page.evaluate(() => { const e = window.__PIXEL_ENGINE__; const s = e.state(); return { status: s.game?.status ?? s.status, errors: e.errors, gpu: s.gpuErrors }; });
