// screenshots of the bundle from file://: node tools/shot.mjs <name> <hash> [--wait ms] [--size 1280x720] [--eval "js"] [--keys "Space,500,KeyJ"]
// writes shots/<name>.png and prints console errors (only what a script can't judge needs a picture)
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NAME } from './name.mjs';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(DEV, 'handoff', 'package.json'));
const { chromium } = require('playwright');
const args = process.argv.slice(2), name = args[0] || 'shot', hash = args[1] || '';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [w, h] = opt('size', '1280x720').split('x').map(Number);
const file = join(DEV, '..', NAME + '.html');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(pathToFileURL(file).href + (hash ? '#' + hash : ''));
await page.waitForTimeout(+opt('wait', 2500));
const ev = opt('eval', null); if (ev) { await page.evaluate(ev); await page.waitForTimeout(+opt('after', 800)); }
for (const k of (opt('keys', '') || '').split(',').filter(Boolean)) { if (/^\d+$/.test(k)) await page.waitForTimeout(+k); else await page.keyboard.press(k); }
await page.waitForTimeout(+opt('settle', 300));
await page.screenshot({ path: join(DEV, 'shots', name + '.png') });
const snap = await page.evaluate(() => { try { return JSON.stringify(window.My3D2dge.current.debug.snapshot()).slice(0, 400); } catch (e) { return String(e); } });
console.log(name, snap); if (errs.length) console.log(errs.slice(0, 12).join('\n'));
await browser.close();
