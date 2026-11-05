// Screenshots of the menus and screens by their address (#drills, #lab, #about, #hall, #dev) from the dev page. Usage: node tools/shots-screens.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
for (const name of (process.argv[2] ? process.argv[2].split(',') : ['drills', 'about', 'hall', 'dev', 'lab'])) {
  await page.goto('about:blank'); await page.goto(pathToFileURL(path.join(here, 'index.html')).href + '#' + name);
  await page.waitForTimeout(name === 'lab' ? 9000 : 1800);
  await page.screenshot({ path: path.join(here, 'shots', 'screen-' + name + '.png') });
  console.log('shot', name);
}
console.log(errors.length ? 'errors: ' + errors.join(' | ') : 'no page errors');
await browser.close();
