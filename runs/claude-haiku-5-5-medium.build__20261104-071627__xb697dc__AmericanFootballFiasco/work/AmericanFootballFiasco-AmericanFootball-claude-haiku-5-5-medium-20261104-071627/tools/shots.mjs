// Screenshots of the game for what a script can't judge (the look). Opens index.html from file://, presses keys, saves PNGs in
// shots/ and prints the page errors and the game's snapshot. Usage: node tools/shots.mjs [name...]
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.BUNDLE ? pathToFileURL(path.resolve(here, '..', process.env.BUNDLE)).href : pathToFileURL(path.join(here, 'index.html')).href;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const snap = () => page.evaluate(() => window.FF && window.FF.game.debug.snapshot());
const shot = async name => { await page.screenshot({ path: path.join(here, 'shots', name + '.png') }); console.log('shot ' + name, JSON.stringify(await snap())); };
await page.goto(url + '#');
await page.waitForTimeout(2500); await shot('title');
await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
await shot('call');
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
await shot('live1');
await page.waitForTimeout(2500);
await shot('live2');
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
await shot('pause');
console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
