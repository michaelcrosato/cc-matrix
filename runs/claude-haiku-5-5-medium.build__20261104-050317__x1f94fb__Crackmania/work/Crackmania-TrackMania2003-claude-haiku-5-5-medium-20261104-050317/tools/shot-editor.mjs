// Look check of the editor (not part of the test command): title, BUILD, two pieces, a screenshot.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, '..', '..', 'Crackmania-TrackMania2003-claude-haiku-5-5-medium-20261104-050317.html');
const out = process.argv[2] || join(HERE, '..', '.tmp', 'editor.png');
const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + FILE, { waitUntil: 'load' });
await page.waitForTimeout(6000);
for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(700); }   // (the first-run intro: confirm turns its pages)
for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200); }
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
await page.keyboard.press('Enter'); await page.waitForTimeout(400);
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
await page.keyboard.press('Enter'); await page.waitForTimeout(400);
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
await page.screenshot({ path: out });
await browser.close();
console.log('errors', errors.length, errors.slice(0, 3));
