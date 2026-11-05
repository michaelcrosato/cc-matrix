// Runs the AI Hub harness's automatic check on the game (the same checks the hub runs when a game joins). Serve test/hub/ on
// 127.0.0.1 first (python3 -m http.server 0 --bind 127.0.0.1 in test/hub/, with GAME.html there). Usage:
//   node tools/hub-check.mjs <port> [players] [extra query, e.g. &latency=150]
import { chromium } from 'playwright';
const port = process.argv[2], players = process.argv[3] || '2', extra = process.argv[4] || '';
const url = `http://127.0.0.1:${port}/harness.html?game=GAME.html&players=${players}&auto=1${extra}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console: ' + m.text()); });
await page.goto(url);
await page.waitForFunction(() => document.body && document.body.dataset.complete === 'true', null, { timeout: 240000, polling: 1000 }).catch(() => {});
const r = await page.evaluate(() => ({ complete: document.body.dataset.complete, pass: window.__hubCheck && window.__hubCheck.pass, checks: window.__hubCheck && window.__hubCheck.checks }));
console.log(JSON.stringify(r, null, 1).slice(0, 3000));
if (errs.length) console.log('page errors:', errs.join(' | '));
await browser.close();
