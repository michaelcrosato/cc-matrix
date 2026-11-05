// The browser check: opens the deliverable from file:// in headless Chromium, walks title, menu, a Beach Match with a few
// presses, the pause menu and the dev panel, and prints the console errors. Prints "errors N" (the test command reads it).
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.resolve(DEV, '..');
const file = fs.readdirSync(WORK).find(f => f.endsWith('.html') && f.startsWith('AheadOrAlive'));
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
const external = [];
page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
await page.goto(pathToFileURL(path.join(WORK, file)).href);
await page.waitForTimeout(2500);
const shot = (n) => page.screenshot({ path: path.join(DEV, 'test-output', n + '.png') });
await shot('browser-title');
for (const k of ['Enter', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter']) { await page.keyboard.press(k); await page.waitForTimeout(800); }
await shot('browser-setup');
for (const k of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'Enter']) { await page.keyboard.press(k); await page.waitForTimeout(400); }
await page.waitForTimeout(1500);
await page.keyboard.press('Space'); await page.waitForTimeout(700);
await shot('browser-match');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await shot('browser-pause');
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
console.log('external requests', external.length);
console.log('errors ' + errs.length);
for (const e of errs.slice(0, 10)) console.log('  ' + e.slice(0, 300));
await browser.close();
