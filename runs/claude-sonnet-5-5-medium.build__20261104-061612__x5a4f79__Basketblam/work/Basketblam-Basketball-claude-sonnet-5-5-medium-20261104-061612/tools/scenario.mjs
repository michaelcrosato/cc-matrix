import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const file = process.argv[2];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).split('\n').slice(0, 2).join(' | '))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(resolve(file)).href + '#exhibition/alley/cats-dogs');
await page.waitForTimeout(1500);
const ev = f => page.evaluate(f);
// get to live play
for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(350); }
await page.waitForTimeout(1200);
await ev(() => { const b = window.__bb, p = b.S.players[0], h = b.HOOPS[1]; b.giveBall(p); p.x = h.x - 70; p.y = h.y + 10; b.S.match.novaT[0] = 40; b.S.players[2].x = 200; b.S.players[3].x = 200; });
await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyD'); await page.waitForTimeout(120); await page.keyboard.press('Space');
for (let i = 0; i < 4; i++) { await page.waitForTimeout(160); await page.screenshot({ path: `check-output/dunk${i}.png` }); }
await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyD');
await page.waitForTimeout(1500); await page.screenshot({ path: 'check-output/after-dunk.png' });
// pause menu
await page.keyboard.press('Escape'); await page.waitForTimeout(600); await page.screenshot({ path: 'check-output/pause.png' });
// choose Dev Mode via click on the button
const btns = await page.$$eval('button', bs => bs.map(b => b.innerText));
console.log('pause buttons:', JSON.stringify(btns));
const dev = await page.$('button:has-text("Dev Mode")'); if (dev) { await dev.click(); await page.waitForTimeout(500); await page.screenshot({ path: 'check-output/dev.png' }); }
for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); }
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); await page.screenshot({ path: 'check-output/dev2.png' });
console.log('state', await ev(() => JSON.stringify({ dev: window.__bb.S.dev, run: window.__bb.TUNING.runSpeed.v, scene: window.__bb.game.sceneName })));
console.log(errs.length ? 'ERRORS ' + errs.join(' || ') : 'no errors');
await browser.close();
