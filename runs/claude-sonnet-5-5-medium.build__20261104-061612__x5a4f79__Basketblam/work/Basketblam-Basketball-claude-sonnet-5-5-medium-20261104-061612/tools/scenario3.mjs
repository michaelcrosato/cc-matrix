import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const file = process.argv[2];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).split('\n').slice(0, 2).join(' | '))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(resolve(file)).href + '#exhibition/roof/cats-dogs');
await page.waitForTimeout(1500);
const ev = f => page.evaluate(f);
for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
await page.waitForTimeout(1500);
// jump shot
await ev(() => { const b = window.__bb, p = b.S.players[0], h = b.HOOPS[1]; b.giveBall(p); p.x = h.x - 130; p.y = h.y + 10; b.S.players[2].x = 150; b.S.players[3].x = 150; b.S.players[1].x = h.x - 60; });
await page.waitForTimeout(150);
await page.keyboard.down('Space'); await page.waitForTimeout(220); await page.screenshot({ path: 'check-output/shot0.png' }); await page.waitForTimeout(120); await page.keyboard.up('Space'); await page.waitForTimeout(250); await page.screenshot({ path: 'check-output/shot1.png' });
await page.waitForTimeout(900); await page.screenshot({ path: 'check-output/shot2.png' });
// shove and steal
await ev(() => { const b = window.__bb, p = b.S.players[0]; p.x = 300; p.y = 250; p.facing = 0; b.S.players[2].x = 318; b.S.players[2].y = 250; b.S.players[2].script = () => b.NOCMD(); });
await page.keyboard.press('KeyQ'); await page.waitForTimeout(130); await page.screenshot({ path: 'check-output/shove.png' });
await page.waitForTimeout(300); await page.screenshot({ path: 'check-output/shove2.png' });
console.log(await ev(() => JSON.stringify(window.__bb.snapshot().lastEvents)));
console.log(errs.length ? 'ERRORS ' + errs.join(' || ') : 'no errors');
await browser.close();
