import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
await p.goto(pathToFileURL(resolve('../TideCrisis3-TimeCrisis3-claude-sonnet-5-5-medium-20261103-183303.html')).href); await p.waitForTimeout(2500);
await p.evaluate(() => { const d = My3D2dge.current.debug; d.start('stage', 1, 'normal', 1); d.jump(1, '1-1', { phase: 'action' }); }); await p.waitForTimeout(1500);
await p.keyboard.press('Escape'); await p.waitForTimeout(1200); await p.getByText('Dev mode').first().click(); await p.waitForTimeout(800);
await p.screenshot({ path: '.tmp/dev1.png' }); await p.keyboard.press('KeyE'); await p.waitForTimeout(300); await p.keyboard.press('KeyE'); await p.waitForTimeout(300); await p.screenshot({ path: '.tmp/dev2.png' });
console.log('devOpen', await p.evaluate(() => My3D2dge.current.debug.Dev.open), errs.join('\n') || 'no errors'); await b.close();
