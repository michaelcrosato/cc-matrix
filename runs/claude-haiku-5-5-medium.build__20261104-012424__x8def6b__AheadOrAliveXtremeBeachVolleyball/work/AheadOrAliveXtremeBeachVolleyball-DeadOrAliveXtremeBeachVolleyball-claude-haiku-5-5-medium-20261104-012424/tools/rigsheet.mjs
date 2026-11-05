// Rig sheet: every fighter in her signature suit and a few others, in a browser, to review the art. Writes test-output/rigsheet.png
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.resolve(DEV, '..');
const file = fs.readdirSync(WORK).find(f => f.endsWith('.html') && f.startsWith('AheadOrAlive'));
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(path.join(WORK, file)).href);
await page.waitForTimeout(2000);
await page.evaluate(() => { const G = window.AOA; G.game.go('title', {}); });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(DEV, 'test-output', 'rigsheet.png') });
await browser.close();
console.log('wrote test-output/rigsheet.png');
