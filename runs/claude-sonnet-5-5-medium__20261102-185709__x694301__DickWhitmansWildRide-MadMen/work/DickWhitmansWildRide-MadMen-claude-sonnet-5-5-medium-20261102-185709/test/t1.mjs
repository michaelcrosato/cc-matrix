import { open } from './lib.mjs';
const { browser, page, errors } = await open();
await page.screenshot({ path: '/tmp/dw_title.png' });
console.log('scene', await page.evaluate(() => window.__game.scene && (window.__game.scene.name || Object.keys(window.__game.scenes||{}))));
console.log(errors.slice(0, 15).join('\n'));
await browser.close();
