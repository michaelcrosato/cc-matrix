import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
const html = process.argv[2], out = process.argv[3] || '../.tmp';
const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error' || m.text().includes('error in')) errs.push(m.text().slice(0, 300)); });
await page.goto(pathToFileURL(html).href); await page.waitForTimeout(2500);
const shot = async n => { await page.screenshot({ path: `${out}/${n}.png` }); };
const ev = f => page.evaluate(f);
const steps = process.argv.slice(4);
await shot('title');
for (const s of steps) {
  if (s.startsWith('key:')) { await page.keyboard.press(s.slice(4)); await page.waitForTimeout(300); }
  else if (s.startsWith('wait:')) await page.waitForTimeout(+s.slice(5));
  else if (s.startsWith('shot:')) await shot(s.slice(5));
  else if (s.startsWith('js:')) { const r = await page.evaluate(s.slice(3)); if (r !== undefined) console.log('js ->', JSON.stringify(r).slice(0, 300)); }
  else if (s.startsWith('mouse:')) { const [x, y] = s.slice(6).split(',').map(Number); await page.mouse.move(x, y); }
  else if (s.startsWith('click')) { await page.mouse.down(); await page.mouse.up(); }
}
console.log('errors:', JSON.stringify(errs.slice(0, 8)));
await browser.close();
