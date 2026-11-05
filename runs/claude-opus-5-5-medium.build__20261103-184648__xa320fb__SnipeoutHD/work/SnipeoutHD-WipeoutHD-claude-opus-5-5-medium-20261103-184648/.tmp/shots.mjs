import { chromium } from 'playwright';
const url = 'file://' + process.cwd() + '/../SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648.html?backend=webgl';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const logs = []; page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
await page.goto(url); await page.waitForFunction(() => window.__game && window.__game.sceneName === 'title', null, { timeout: 60000 });
const steps = JSON.parse(process.argv[2] || '[]');
for (const [code, name, wait] of steps) { if (code) await page.evaluate(code); await page.waitForTimeout(wait || 1200); if (name) await page.screenshot({ path: 'tests/out/' + name + '.png' }); }
console.log(logs.join('\n') || 'ok'); await browser.close();
