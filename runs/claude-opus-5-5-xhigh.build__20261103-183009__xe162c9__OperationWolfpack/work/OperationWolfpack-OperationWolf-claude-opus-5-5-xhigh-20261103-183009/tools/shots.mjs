// node tools/shots.mjs: screenshots of the UI screens (deep links) into shots/ui-*.png
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const base = pathToFileURL(resolve('dev/index.html')).href;
const list = [
  ['map', '#map', 2500], ['tally', '#tally/op3', 9000], ['continue', '#continue', 1500], ['ending', '#ending/5', 12000], ['about', '#about', 1500],
  ['squad', '#squad', 1500], ['opcard', '#op4', 1800], ['pause', '#op1', 3000, "My3D2dge.current.input.tap('pause')"], ['dev', '#dev', 3500],
  ['settings', '#title', 1500, "My3D2dge.current.menu('settings')"], ['touch', '#touch', 1500], ['interrogation', '#cut/interrogation', 9000], ['aftermath', '#cut/aftermath', 4000], ['briefing', '#cut/briefing', 5000]
];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [name, hash, wait, ev] of list) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + hash); await page.waitForTimeout(wait);
  if (ev) { await page.evaluate(ev); await page.waitForTimeout(800); }
  await page.screenshot({ path: 'shots/ui-' + name + '.png' });
  const sc = await page.evaluate(() => My3D2dge.current.sceneName + ' errors ' + My3D2dge.current.errors.length);
  console.log(name, sc, errs.join(' | ').slice(0, 300));
  await page.close();
}
await browser.close();
