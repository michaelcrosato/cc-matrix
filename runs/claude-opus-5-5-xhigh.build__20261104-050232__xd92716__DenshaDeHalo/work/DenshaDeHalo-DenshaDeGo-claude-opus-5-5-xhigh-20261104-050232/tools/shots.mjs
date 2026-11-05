// look-review screenshots: node tools/shots.mjs [name ...] -> shots/<name>.png at 1280x720 (scenes by deep link, some with key steps)
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const page0 = resolve(process.argv.find(a => a.endsWith('.html')) || 'index.html');
const ALL = {
  title: ['', 3000], halomap: ['halomap', 2500], free: ['free', 2500], log: ['log', 2500], about: ['about', 2000], aboutsrc: ['about', 1500, ['ArrowRight', 'ArrowDown']], abouttest: ['about', 1500, ['ArrowRight', 'ArrowRight']], duel: ['duel', 2500],
  attract: ['attract', 9000], s1: ['stage=S1', 6000], s1run: ['stage=S1&s=1350&v=55&clock=06:42:00&auto=1', 5000], s2: ['stage=S2&s=5350&v=40&clock=10:17:50&auto=1', 6000],
  s3: ['stage=S3&s=9560&v=24&clock=14:01:50&auto=1', 5000], s4: ['stage=S4&s=12600&v=60&clock=17:30:40&auto=1&cam=chaseHigh', 5000], s5: ['stage=S5&s=20250&v=40&clock=23:16:40&auto=1', 5000],
  s0: ['stage=S0', 5000], results: ['results=S1', 6000], ending: ['ending', 4000], plat: ['stage=S1&cam=platform', 5000],
  stopcam: ['stage=S1&s=1540&v=28&clock=06:42:17&auto=1', 9500], glove: ['stage=S1&s=1960&v=50&clock=06:43:20&auto=1', 7300], glove2: ['stage=S1&s=1960&v=50&clock=06:43:20&auto=1', 7900], crowd: ['stage=S4&cam=platform', 3500],
  duelrun: ['duel=auto', 9000], touch: ['', 3000, null, true], brief: ['halomap', 2000, ['Enter']], credits: ['ending', 3000, ['Escape', 'Escape', 'Escape', 'Escape', 'Escape', 'Escape', 'Escape']],
  dev: ['stage=S1', 3000, ['Escape']], devmode: ['stage=S1', 1500, ['Escape', 'ArrowDown', 'ArrowDown', 'Enter']], balance: ['stage=S1', 1500, ['Escape', 'ArrowDown', 'ArrowDown', 'Enter', ...Array(19).fill('ArrowDown'), 'Enter']], help: ['', 1500, ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter']], settings: ['', 1500, ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter']], night: ['stage=S5&s=19700&v=60&clock=23:16:30&auto=1', 3000], rain: ['stage=S2&s=3800&v=60&clock=10:15:40&auto=1', 4000], fog: ['stage=S5&s=16300&v=50&clock=23:11:00&auto=1', 3000]
};
const names = process.argv.slice(2).filter(a => !a.endsWith('.html') && !/^\d+$/.test(a)), list = names.length ? names : Object.keys(ALL);
const [w, h] = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const n of list) {
  const [hash, wait, keys, touch] = ALL[n] || [n, 3000];
  const ctx = await browser.newContext(touch ? { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true } : { viewport: { width: w || 1280, height: h || 720 } }), page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + page0 + (hash ? '#' + hash : ''));
  if (keys) { await page.waitForTimeout(1500); for (const k of keys) { await page.keyboard.press(k); await page.waitForTimeout(700); } }
  await page.waitForTimeout(wait);
  await page.screenshot({ path: 'shots/' + n + '.png' });
  const snap = await page.evaluate(() => window.__dh && JSON.stringify(window.__dh.snapshot()).slice(0, 160)).catch(() => '');
  console.log(n + (errs.length ? '  ERRORS: ' + errs.slice(0, 3).join(' | ') : '') + '  ' + snap);
  await ctx.close();
}
await browser.close();
