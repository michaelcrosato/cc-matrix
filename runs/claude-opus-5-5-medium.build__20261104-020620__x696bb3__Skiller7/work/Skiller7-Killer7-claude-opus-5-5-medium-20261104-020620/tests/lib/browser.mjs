// The browser harness: the built single file over file://, the CDN routed to vendor/ (tests never touch the network).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
export const NAME = 'Skiller7-Killer7-claude-opus-5-5-medium-20261104-020620';
export const FILE = 'file://' + join(ROOT, '..', NAME + '.html');
const VENDOR = {
  'three.webgpu.min.js': 'vendor/three-0.182.0/three.webgpu.min.js', 'three.core.min.js': 'vendor/three-0.182.0/three.core.min.js', 'three.tsl.min.js': 'vendor/three-0.182.0/three.tsl.min.js', 'rapier.mjs': 'vendor/rapier3d-simd-compat-0.19.3/rapier.js'
};
export async function routeCdn(ctx) {
  await ctx.route(/cdn\.jsdelivr\.net/, route => {
    const u = route.request().url(), f = Object.keys(VENDOR).find(k => u.endsWith('/' + k));
    if (!f) return route.fulfill({ status: 404, body: 'not vendored' });
    route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/javascript' }, body: readFileSync(join(ROOT, VENDOR[f])) });
  });
}
export async function launch(o = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o.context || {}));
  await routeCdn(ctx);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return { browser, ctx, page, errors };
}
export async function boot(page, q = '?backend=webgl', hash = '') {
  await page.goto(FILE + q + hash);
  await page.waitForFunction(() => window.S7 && window.S7.started && window.__game && window.__game.game.sceneName, null, { timeout: 60000 });
  await page.waitForTimeout(500);
}
