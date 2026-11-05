// A look at the About pages (not part of the test count): node tests/shots-about.mjs <html> <outdir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [, , file, outArg] = process.argv;
const out = resolve(outArg || 'shots'); mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(resolve(file)).href);
await page.waitForTimeout(2500);
for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300); }
await page.keyboard.press('Enter'); await page.waitForTimeout(900);
await page.screenshot({ path: out + '/about-1.png' });
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400);
await page.screenshot({ path: out + '/about-2.png' });
await browser.close();
