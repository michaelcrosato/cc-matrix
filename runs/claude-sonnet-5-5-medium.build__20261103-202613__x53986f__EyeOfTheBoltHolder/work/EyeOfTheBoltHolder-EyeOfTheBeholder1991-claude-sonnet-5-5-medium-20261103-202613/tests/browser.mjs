// Browser helper: open the built bundle from file:// in headless Chromium (WebGL 2), collect errors, optional script, screenshot.
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const dev = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), root = path.resolve(dev, '..');
export const FILE = fs.readdirSync(root).find(f => f.endsWith('.html') && f.startsWith('EyeOfTheBoltHolder'));
export async function open(o = {}) {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o.ctx || {})); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); if (o.log && m.type() !== 'error') console.log('  [page]', m.text().slice(0, 200)); });
  await page.goto('file://' + path.join(root, FILE) + (o.q || '?backend=webgl'));
  return { b, page, errs };
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
if (process.argv[1].endsWith('browser.mjs')) {
  const { b, page, errs } = await open({ log: false });
  await page.waitForFunction(() => window.__game && window.__game.game.sceneName === 'title', null, { timeout: 90000 }).catch(e => errs.push('boot timeout'));
  console.log('errs', errs.slice(0,6)); await sleep(1500); await page.screenshot({ path: 'shots/title.png' });
  const info = await page.evaluate(() => { if (!window.__game) return 'no game'; const g = window.__game.game; return { scene: g.sceneName, errors: g.errors.map(e => e.where + ': ' + e.message), boot: g.bootError && String(g.bootError) }; });
  console.log(JSON.stringify(info), errs.slice(0, 8)); await b.close();
}
