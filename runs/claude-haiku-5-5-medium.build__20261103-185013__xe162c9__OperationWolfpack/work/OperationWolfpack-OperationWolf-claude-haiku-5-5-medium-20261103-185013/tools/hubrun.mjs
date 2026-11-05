// Runs the game in the AI Hub harness, two players, and prints the harness's checks. Usage: node tools/hubrun.mjs <port> [players]
// The harness and the game are served by a local static server started by the caller (127.0.0.1 only).
import { chromium } from '../vendor/pw/node_modules/playwright/index.mjs';
import { TITLE_FILE } from './files.mjs';
const port = process.argv[2], players = process.argv[3] || '2';
const dev = 'OperationWolfpack-OperationWolf-claude-haiku-5-5-medium-20261103-185013';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://127.0.0.1:${port}/${dev}/hub/harness.html?auto=1&game=/${TITLE_FILE}.html`);

await page.waitForTimeout(500);

await page.waitForTimeout(60000);
console.log('ROUND:', (await page.textContent('#round')).slice(0, 400));
console.log('CHECKS:', (await page.textContent('#checklist')).replace(/\s+/g, ' ').slice(0, 1500));
console.log("LOG tail:", (await page.textContent("#log")).slice(-2500));
console.log('PAGE ERRORS:', errors.slice(0, 5));
await browser.close();
