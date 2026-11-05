// Browser smoke + screenshots: node test/shot.mjs [file.html] name:js ...   (js runs in the page, then waits and shoots)
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const args = process.argv.slice(2); const file = args[0].endsWith('.html') ? args.shift() : 'index.html';
const steps = args.map(a => { const i = a.indexOf(':'); return [a.slice(0, i), a.slice(i + 1)]; });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e && e.stack || e))); page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('my-3D2dge'))) errors.push(m.text()); });
await page.goto(pathToFileURL(resolve(file)).href); await page.waitForTimeout(1500);
for (const [name, js] of steps) {
  const wait = /^(\d+)$/.test(js) ? +js : 0;
  if (js.startsWith('KEY:')) { for (const k of js.slice(4).split(',')) { if (/^\d+$/.test(k)) await page.waitForTimeout(+k); else if (k.startsWith('+')) await page.keyboard.down(k.slice(1)); else if (k.startsWith('-')) await page.keyboard.up(k.slice(1)); else { await page.keyboard.press(k); await page.waitForTimeout(120); } } }
  else if (!wait) { try { await page.evaluate(js); } catch (e) { errors.push('eval ' + name + ': ' + e.message); } await page.waitForTimeout(1200); } else await page.waitForTimeout(wait);
  await page.screenshot({ path: 'shots/' + name + '.png' });
}
const info = await page.evaluate(() => { const g = My3D2dge.current; return { scene: g.sceneName, errs: g.errors.map(e => e.message), fps: g.fps }; });
console.log(JSON.stringify(info)); console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 8).join('\n---\n') : 'no page errors');
await browser.close();
