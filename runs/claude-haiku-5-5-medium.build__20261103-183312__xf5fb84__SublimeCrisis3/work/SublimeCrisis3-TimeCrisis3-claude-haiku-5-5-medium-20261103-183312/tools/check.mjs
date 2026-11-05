// Browser smoke test: opens the single HTML (or the dev page) from file://, watches the console for errors, presses a
// few keys, and saves screenshots to check-output/. Prints the errors and one line. Usage:
//   node tools/check.mjs [path-to-html] [--shots]
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const arg = process.argv.slice(2).find(a => !a.startsWith('--'));
const shots = process.argv.includes('--shots');
const file = arg ? resolve(arg) : resolve(root, '..', 'SublimeCrisis3-TimeCrisis3-claude-haiku-5-5-medium-20261103-183312.html');
if (!existsSync(file)) { console.log('FAIL missing ' + file); process.exit(1); }
const out = join(root, 'check-output');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.TC && TC.game && TC.game.scene, null, { timeout: 30000 }); await page.waitForTimeout(1500);
if (shots) await page.screenshot({ path: join(out, '01-title.png') });
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
if (shots) await page.screenshot({ path: join(out, '02-menu.png') });
await page.keyboard.press('Enter');
await page.waitForTimeout(800);
await page.keyboard.press('Enter');
await page.waitForTimeout(800);
await page.keyboard.press('Enter');
await page.waitForTimeout(1500);
if (shots) await page.screenshot({ path: join(out, '03-play.png') });
for (let i = 0; i < 6; i++) { await page.mouse.move(640 + i * 20, 360); await page.mouse.down(); await page.waitForTimeout(200); await page.mouse.up(); await page.waitForTimeout(200); }
await page.waitForTimeout(1500);
if (shots) await page.screenshot({ path: join(out, '04-fire.png') });
const info = await page.evaluate(() => ({ hasTC: typeof window.TC !== 'undefined', title: document.title }));
await browser.close();
for (const e of errors.slice(0, 20)) console.log(e);
console.log(errors.length ? `${errors.length} error(s) in the browser` : `browser smoke ok (${JSON.stringify(info)})`);
process.exit(errors.length ? 1 : 0);
