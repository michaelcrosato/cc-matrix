import { open, sleep } from './browser.mjs';
const { b, page, errs } = await open({});
await page.waitForFunction(() => window.__game && window.__game.game.sceneName === 'title', null, { timeout: 90000 });
const sc = () => page.evaluate(() => window.__game.game.sceneName);
const t0 = Date.now(); while ((await sc()) !== 'attract' && Date.now() - t0 < 30000) await sleep(300);
console.log('attract after', ((Date.now() - t0) / 1000).toFixed(1), await sc());
const seen = new Set(); for (let i = 0; i < 90; i++) { await sleep(1000); const s = await page.evaluate(() => { const g = window.__game; return g.game.sceneName + ' ' + (g.B.S ? g.B.S.floor : ''); }); seen.add(s); if (i === 10) await page.screenshot({ path: 'shots/attract.png' }); if (i === 40) await page.screenshot({ path: 'shots/attract2.png' }); }
console.log([...seen]);
await page.keyboard.press('KeyA'); await sleep(1500); console.log('after key', await sc());
console.log(JSON.stringify(await page.evaluate(() => window.__game.game.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join('|')))), errs.slice(0, 4));
await b.close();
