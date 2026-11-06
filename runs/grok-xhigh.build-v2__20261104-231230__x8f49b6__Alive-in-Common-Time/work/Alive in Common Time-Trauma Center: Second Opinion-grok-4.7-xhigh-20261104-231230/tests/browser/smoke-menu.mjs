import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const named = readdirSync('..').find((f) => f.endsWith('-Trauma Center: Second Opinion-grok-4.7-xhigh-20261104-231230.html'));
const html = path.resolve('..', named);
const url = `file://${html}?test=1&norender=1`;
const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.__game && window.__game.state().screen === 'Title', null, { timeout: 15000 });
const gain = await page.evaluate(() => window.__game.state().musicGain);
await page.keyboard.press('Enter');
await page.evaluate(() => window.__game.test.step(1));
const menu = await page.evaluate(() => window.__game.state().screen);
await page.keyboard.press(' ');
await page.evaluate(() => window.__game.test.step(1));
const ask = await page.evaluate(() => document.body.innerText.includes('How much do you hate yourself, child?'));
const focus = await page.evaluate(() => window.__game.state().focusId);
await page.keyboard.press('Enter');
await page.evaluate(() => window.__game.test.step(1));
const story = await page.evaluate(() => ({
  screen: window.__game.state().screen,
  text: document.body.innerText.slice(0, 280),
}));
await page.keyboard.press(' ');
await page.evaluate(() => window.__game.test.step(1));
const after = await page.evaluate(() => document.body.innerText.slice(0, 280));
console.log(JSON.stringify({ gain, menu, ask, focus, story, after, errors }, null, 2));
await browser.close();
