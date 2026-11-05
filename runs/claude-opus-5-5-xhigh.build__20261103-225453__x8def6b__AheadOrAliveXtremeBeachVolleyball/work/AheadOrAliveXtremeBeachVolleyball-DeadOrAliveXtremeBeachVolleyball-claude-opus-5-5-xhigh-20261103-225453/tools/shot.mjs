// Screenshots of the built game: node tools/shot.mjs <name> "<js to run in the page, after boot>" [waitMs] [WxH]
// The page loads the deliverable from file://; the script runs with window.AOA (G) and the game (G.game).
import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from './build.mjs';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const [name = 'shot', script = '', wait = '1500', size = '1280x720'] = process.argv.slice(2);
if (!process.env.NOBUILD) build();
const html = join(DEV, '..', basename(DEV) + '.html');
mkdirSync(join(DEV, 'test-output/shots'), { recursive: true });
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await page.goto(pathToFileURL(html).href);
await page.waitForFunction(() => window.AOA && window.AOA.game && window.AOA.game.sceneName, null, { timeout: 20000 });
await page.waitForTimeout(600);
const steps = script.split(' ;; ');
let i = 0;
for (const s of steps) {
  if (s.startsWith('wait:')) { await page.waitForTimeout(+s.slice(5)); continue; }
  if (s.startsWith('key:')) { await page.keyboard.press(s.slice(4)); continue; }
  if (s.startsWith('shot:')) { await page.screenshot({ path: join(DEV, 'test-output/shots', name + '-' + s.slice(5) + '.png') }); i++; continue; }
  if (s.trim()) { const r = await page.evaluate(code => { try { const G = window.AOA, game = G.game; return String(eval(code)); } catch (e) { return 'ERR ' + e.message; } }, s); if (r && r !== 'undefined') console.log('>', r.slice(0, 300)); }
}
await page.waitForTimeout(+wait);
await page.screenshot({ path: join(DEV, 'test-output/shots', name + '.png') });
const gameErrs = await page.evaluate(() => (window.AOA.game.errors || []).map(e => (e.where || '') + ' ' + e.message));
await browser.close();
console.log([...errs, ...gameErrs].filter(e => !/favicon/.test(e)).slice(0, 12).join('\n') || 'no errors');
