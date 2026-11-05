// Screenshots: node tools/shots.mjs <page> <out-dir> <name>=<hash>[@ms][!keys] ... [--size 1280x720]
// keys: comma list of key presses (e.g. Enter,ArrowDown) sent after load; @ms waits before the shot.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const DEV = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(path.join(DEV, 'vendor/my-3d2dge/dist/handoff/package.json'));
const { chromium } = require('playwright');
const args = process.argv.slice(2), size = (args.find(a => a.startsWith('--size=')) || '--size=1280x720').slice(7).split('x').map(Number);
const page0 = path.resolve(args[0]), out = path.resolve(args[1]); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const spec of args.slice(2).filter(a => !a.startsWith('--'))) {
  const [name, rest] = spec.split('='); const m = /^([^@!]*)(?:@(\d+))?(?:!(.*))?$/.exec(rest || '');
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', msg => { if (msg.type() === 'error' || /my-3D2dge:/.test(msg.text())) errs.push(msg.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('file://' + page0 + (m[1] ? '#' + m[1] : ''));
  await page.waitForTimeout(1200);
  if (m[3]) for (const k of m[3].split(',')) { if (k.startsWith('w')) await page.waitForTimeout(+k.slice(1)); else { await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k); await page.waitForTimeout(150); } }
  await page.waitForTimeout(+(m[2] || 1500));
  await page.screenshot({ path: path.join(out, name + '.png') });
  const snap = await page.evaluate(() => window.__oly && window.__oly.game.debug.snapshot());
  console.log(name, snap ? snap.scene + ' ' + (snap.phase || '') + ' ' + (snap.sub || '') : '?', errs.length ? 'ERRORS: ' + errs.join(' | ') : '');
  await ctx.close();
}
await browser.close();
