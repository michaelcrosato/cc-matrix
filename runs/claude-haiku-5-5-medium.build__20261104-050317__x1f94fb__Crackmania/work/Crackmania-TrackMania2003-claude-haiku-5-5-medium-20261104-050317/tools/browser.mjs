// Playwright checks of the built file, opened from file://: no errors on boot, the title drawn, and a screenshot on request.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, '..', '..', 'Crackmania-TrackMania2003-claude-haiku-5-5-medium-20261104-050317.html');
const shot = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1] : null;

const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('file://' + FILE, { waitUntil: 'load' });
await page.waitForTimeout(25000);
if (shot) await page.screenshot({ path: shot });
const info = await page.evaluate(() => {
  const g = globalThis.__crackmania && globalThis.__crackmania.game;
  return g ? { scene: g.scene && g.scene.name, errors: (g.errors || []).length, paused: g.paused } : null;
});
await browser.close();
console.log(JSON.stringify({ info, errors: errors.slice(0, 20), errorCount: errors.length }, null, 1));
