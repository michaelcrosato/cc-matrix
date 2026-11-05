// Review screenshots of screens reached through the game's own scene calls (the deliverable, from file://).
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.resolve(DEV, '..');
const file = fs.readdirSync(WORK).find(f => f.endsWith('.html') && f.startsWith('AheadOrAlive'));
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(pathToFileURL(path.join(WORK, file)).href);
await page.waitForTimeout(2000);
const go = async (name, data, out, wait = 1500) => {
  await page.evaluate(([n, d]) => { const G = window.AOA; G.game.go(n, d); }, [name, data]);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(DEV, 'test-output', out + '.png') });
};
await go('dev', { from: 'title', tab: 2 }, 'shot-dev-presentation');
await page.evaluate(() => { const G = window.AOA; G.game.go('attract', {}); });
await page.waitForTimeout(800);
await page.evaluate(() => { const G = window.AOA; const d = G.game; });
await go('postcard', { spec: { place: 'beach', day: 2, slot: 1, weather: 'sunny', pose: 'Victory', filter: 'Sunny', who: 'lola', suit: 'estrella', acc: ['sweatband'], frame: 'postcard' }, back: 'album' }, 'shot-postcard');
await go('album', { from: 'menu' }, 'shot-album');
await browser.close();
console.log('ok');
