import { chromium } from 'playwright';
const url = 'file://' + process.cwd() + '/../SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648.html?backend=webgl';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }); const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url); await page.waitForFunction(() => window.__game && window.__game.sceneName === 'title', null, { timeout: 90000 });
const s = () => page.evaluate(() => [window.__game.sceneName, SN.UI.top() && SN.UI.top().id, SN.UI.focus, SN.Academy.phase, window.__game.paused].join(' '));
await page.waitForTimeout(800); await page.keyboard.press('Enter'); await page.waitForTimeout(1500); console.log('after Enter', await s());
for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300); } console.log('after downs', await s());
await page.keyboard.press('Enter'); for (let i = 0; i < 8; i++) { await page.waitForTimeout(1500); console.log('t', i, await s()); }
await b.close();
