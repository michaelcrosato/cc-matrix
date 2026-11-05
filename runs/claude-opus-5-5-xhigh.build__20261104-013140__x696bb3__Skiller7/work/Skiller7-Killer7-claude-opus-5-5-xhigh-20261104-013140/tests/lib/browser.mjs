// Browser harness: headless Chromium (Playwright) with the four CDN URLs routed to the vendored copies, so tests never
// depend on the network. Pages load over file:// (or a local server for the hub harness).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
process.env.TMPDIR = path.join(ROOT, 'tmp');
fs.mkdirSync(process.env.TMPDIR, { recursive: true });

const VENDOR = {
  'three@0.182.0/build/three.webgpu.min.js': 'vendor/three-0.182.0/three.webgpu.min.js',
  'three@0.182.0/build/three.core.min.js': 'vendor/three-0.182.0/three.core.min.js',
  'three@0.182.0/build/three.tsl.min.js': 'vendor/three-0.182.0/three.tsl.min.js',
  '@dimforge/rapier3d-simd-compat@0.19.3/rapier.mjs': 'vendor/rapier3d-simd-compat-0.19.3/rapier.js'
};

export async function launch(o = {}) {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--disable-gpu-sandbox'], ...o.launch });
  return browser;
}

export async function routeCDN(ctx) {
  await ctx.route(/cdn\.jsdelivr\.net\/npm\//, async route => {
    const u = route.request().url(), key = Object.keys(VENDOR).find(k => u.endsWith(k));
    if (!key) return route.fulfill({ status: 404, body: 'not vendored: ' + u });
    route.fulfill({ status: 200, headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(ROOT, VENDOR[key])) });
  });
}

/** opens a page; returns { page, ctx, errors } with console errors and page errors collected */
export async function open(browser, url, o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 1280, height: 720 }, hasTouch: !!o.hasTouch, isMobile: !!o.isMobile, deviceScaleFactor: 1 });
  await routeCDN(ctx);
  if (o.init) await ctx.addInitScript(o.init);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(url);
  return { page, ctx, errors };
}

export const fileURL = p => 'file://' + path.resolve(ROOT, p);
