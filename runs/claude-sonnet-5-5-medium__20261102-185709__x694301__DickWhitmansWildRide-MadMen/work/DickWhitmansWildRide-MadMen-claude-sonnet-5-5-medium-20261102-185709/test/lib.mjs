import { createRequire } from 'module';
const require = createRequire('/home/micha/.npm/_npx/9833c18b2d85bc59/node_modules/');
export const pw = require('playwright-core');
export const GAME = new URL('../../DickWhitmansWildRide-MadMen-claude-sonnet-5-5-medium-20261102-185709.html', import.meta.url).pathname;
export async function open(opts = {}) {
  const browser = await pw.chromium.launch({ executablePath: '/home/micha/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR ' + e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
  await page.goto('file://' + GAME + (opts.q || ''));
  await page.waitForTimeout(opts.wait || 1500);
  return { browser, page, errors };
}
