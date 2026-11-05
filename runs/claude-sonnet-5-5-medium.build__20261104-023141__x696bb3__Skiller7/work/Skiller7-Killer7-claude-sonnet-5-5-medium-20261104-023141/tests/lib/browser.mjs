import { chromium } from 'playwright'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const GAME = path.resolve(root, '..', 'Skiller7-Killer7-claude-sonnet-5-5-medium-20261104-023141.html');
export async function open(query = '', opts = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: opts.w || 960, height: opts.h || 540 } });
  const page = await ctx.newPage(); const errors = [], logs = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); else logs.push(m.text()); });
  await page.goto('file://' + GAME + '?backend=webgl' + query);
  return { browser, page, errors, logs };
}
export async function waitStarted(page, ms = 60000) { await page.waitForFunction(() => window.S7 && S7.started && S7.game && S7.game.sceneName, null, { timeout: ms }); }
