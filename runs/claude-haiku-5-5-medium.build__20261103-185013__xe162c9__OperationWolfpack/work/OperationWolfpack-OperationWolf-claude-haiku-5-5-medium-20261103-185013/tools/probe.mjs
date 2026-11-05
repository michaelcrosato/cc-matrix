// Probe: what buffer size the engine gave the game in the browser. node tools/probe.mjs
import { chromium } from '../vendor/pw/node_modules/playwright/index.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { TITLE_FILE } from './files.mjs';
const html = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', TITLE_FILE + '.html');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto(pathToFileURL(html).href + '#op1'); await page.waitForTimeout(1500);
console.log(await page.evaluate(() => { const c = document.querySelector('canvas'); return JSON.stringify({ W: WP.game.W, H: WP.game.H, cw: c.width, ch: c.height, css: [c.style.width, c.style.height, c.clientWidth, c.clientHeight], scene: WP.game.sceneName }); }));
await browser.close();
