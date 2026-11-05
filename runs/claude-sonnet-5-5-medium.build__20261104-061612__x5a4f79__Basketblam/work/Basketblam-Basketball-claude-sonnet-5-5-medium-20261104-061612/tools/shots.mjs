// screenshots of several screens: node tools/shots.mjs <html> name:hash[:waitMs] ...
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const [file, ...specs] = process.argv.slice(2);
mkdirSync('check-output', { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const spec of specs) {
  const [name, hash, wait = '1800', keys = ''] = spec.split(':');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).split('\n').slice(0, 3).join(' | '))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(pathToFileURL(resolve(file)).href + '#' + hash);
  await page.waitForTimeout(+wait);
  for (const k of keys.split(',').filter(Boolean)) { await page.keyboard.press(k); await page.waitForTimeout(250); }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `check-output/${name}.png` });
  const snap = await page.evaluate(() => { try { return JSON.stringify(window.__bb.snapshot()).slice(0, 200); } catch (e) { return String(e); } });
  console.log(name, errs.length ? 'ERRORS: ' + errs.join(' || ') : 'ok', snap.slice(0, 120));
  await page.close();
}
await browser.close();
