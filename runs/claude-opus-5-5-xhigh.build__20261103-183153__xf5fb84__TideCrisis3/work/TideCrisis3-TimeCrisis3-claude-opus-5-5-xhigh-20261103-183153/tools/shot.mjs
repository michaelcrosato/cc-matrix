// node tools/shot.mjs <page> <out.png> [--wait ms] [--size 1280x720] [--eval js] [--keys "Enter,wait:500,..."]
// Opens a page from file:// in headless Chromium, runs steps, saves a screenshot, prints console errors.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const args = process.argv.slice(2), page0 = args[0], out = args[1];
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const [w, h] = (opt('size') || '1280x720').split('x').map(Number);
process.env.TMPDIR = process.env.TMPDIR || resolve('.tmp'); mkdirSync(process.env.TMPDIR, { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); else if (args.includes('--log')) console.log('log:', m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
const url = page0.startsWith('http') ? page0 : 'file://' + resolve(page0.split('#')[0]) + (page0.includes('#') ? '#' + page0.split('#')[1] : '') + (page0.includes('?') ? '' : '');
await page.goto(url);
await page.waitForTimeout(+(opt('wait') || 1500));
for (const s of (opt('keys') || '').split('|').filter(Boolean)) {
  if (s.startsWith('wait:')) await page.waitForTimeout(+s.slice(5));
  else if (s.startsWith('eval:')) console.log('eval:', JSON.stringify(await page.evaluate(s.slice(5))));
  else if (s.startsWith('down:')) await page.keyboard.down(s.slice(5));
  else if (s.startsWith('up:')) await page.keyboard.up(s.slice(5));
  else if (s.startsWith('click:')) { const [x, y] = s.slice(6).split(':').map(Number); await page.mouse.click(x, y); }
  else if (s.startsWith('move:')) { const [x, y] = s.slice(5).split(':').map(Number); await page.mouse.move(x, y); }
  else if (s.startsWith('shot:')) await page.screenshot({ path: s.slice(5) });
  else await page.keyboard.press(s);
}
if (opt('eval')) console.log('eval:', JSON.stringify(await page.evaluate(opt('eval'))));
if (out) await page.screenshot({ path: out });
for (const e of errs.slice(0, 20)) console.log(e);
await browser.close();
