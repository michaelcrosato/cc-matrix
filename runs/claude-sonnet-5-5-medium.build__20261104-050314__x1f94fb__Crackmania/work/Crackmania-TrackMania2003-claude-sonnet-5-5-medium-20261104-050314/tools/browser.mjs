import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILE = ROOT + '../Crackmania-TrackMania2003-claude-sonnet-5-5-medium-20261104-050314.html';
const hash = process.argv[2] || '';
const shot = process.argv[3] || '';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--enable-webgl'] });
const p = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 300)); });
await p.goto('file://' + FILE + '?backend=webgl' + (hash ? '#' + hash : ''));
await p.waitForFunction(() => window.__crack && window.__crack.game && window.__crack.game.sceneName, null, { timeout: 90000 }).catch(e => errs.push('BOOT TIMEOUT'));
await p.waitForTimeout(+(process.argv[4] || 3000)); if (process.argv[5]) { await p.keyboard.down(process.argv[5]); await p.waitForTimeout(+(process.argv[6] || 4000)); }
console.log(JSON.stringify(await p.evaluate(() => window.__crack && window.__crack.game.debug.snapshot())));
if (shot) await p.screenshot({ path: shot });
console.log('errors', errs.length, errs.slice(0, 5));
await b.close();
