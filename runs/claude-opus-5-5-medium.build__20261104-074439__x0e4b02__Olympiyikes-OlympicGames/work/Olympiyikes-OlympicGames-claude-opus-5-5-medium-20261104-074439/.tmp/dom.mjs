import { createRequire } from 'node:module';
const require = createRequire(new URL('../vendor/my-3d2dge/dist/handoff/package.json', import.meta.url)); const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(new URL('../../Olympiyikes-OlympicGames-claude-opus-5-5-medium-20261104-074439.html', import.meta.url).href); await p.waitForTimeout(1500);
await p.evaluate(() => window.__oly.game.menu('settings')); await p.waitForTimeout(500);
console.log(await p.evaluate(() => [...document.querySelectorAll('.esh-pan *')].filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 16).slice(0, 8).map(e => e.tagName + '.' + e.className + ' ' + getComputedStyle(e).fontSize + ' ' + e.textContent.slice(0, 25)).join('\n')));
await b.close();
