// screenshots of deep links in headless Chromium (only for what a script can't check): node tools/shots.mjs [hash ...] [--wait ms] [--size WxH] [--keys "k1,k2"]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), FILE = join(DEV, '..', basename(DEV) + '.html');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const hashes = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [w, h] = opt('size', '1280x720').split('x').map(Number), wait = +opt('wait', 3000), keys = opt('keys', '');
mkdirSync(join(DEV, 'shots'), { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const hsh of hashes.length ? hashes : ['title']) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(pathToFileURL(FILE).href + (hsh.startsWith('?') ? hsh : '#' + hsh));
  await page.waitForTimeout(800);
  for (const k of keys.split(',').filter(Boolean)) { if (k.startsWith('wait')) await page.waitForTimeout(+k.slice(4)); else await page.keyboard.press(k); await page.waitForTimeout(150); }
  await page.waitForTimeout(wait);
  const name = hsh.replace(/[^a-z0-9]+/gi, '_') || 'title';
  await page.screenshot({ path: join(DEV, 'shots', name + '.png') });
  const snap = await page.evaluate(() => { try { const g = window.My3D2dge.current; return JSON.stringify({ s: g.debug.snapshot(), e: g.errors.map(e => String(e.message || e)).slice(0, 3) }); } catch (e) { return String(e); } });
  console.log(name, snap.slice(0, 300), errs.length ? 'ERRORS: ' + errs.slice(0, 3).join(' | ') : '');
  await page.close();
}
await browser.close();
