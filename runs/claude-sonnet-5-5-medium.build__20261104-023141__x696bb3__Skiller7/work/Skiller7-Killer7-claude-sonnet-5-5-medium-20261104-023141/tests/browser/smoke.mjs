import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page, errors, logs } = await open();
try {
  await waitStarted(page);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/out/title.png' });
  console.log('scene', await page.evaluate(() => S7.game.sceneName), 'errors', errors.length);
} catch (e) { console.log('FAILED', e.message); await page.screenshot({ path: 'tests/out/fail.png' }); }
console.log(errors.slice(0, 12).join('\n')); console.log(logs.slice(-12).join('\n'));
await browser.close();
