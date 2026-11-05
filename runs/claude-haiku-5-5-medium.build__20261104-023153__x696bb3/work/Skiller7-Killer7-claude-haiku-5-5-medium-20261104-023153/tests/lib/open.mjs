// Opens the built game from file:// in headless Chromium (WebGL, no GPU needed) and returns the page with its error log.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dev = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const GAME = path.resolve(dev, '..', 'Skiller7-Killer7-claude-haiku-5-5-medium-20261104-023153.html');
export const OUT = path.join(dev, 'out');

export async function open({ query = '' } = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(pathToFileURL(GAME).href + query, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.debug && window.__game.debug.snapshot().scene === 'title', null, { timeout: 90000 });
  await page.waitForTimeout(300);
  return { browser, page, errors };
}
