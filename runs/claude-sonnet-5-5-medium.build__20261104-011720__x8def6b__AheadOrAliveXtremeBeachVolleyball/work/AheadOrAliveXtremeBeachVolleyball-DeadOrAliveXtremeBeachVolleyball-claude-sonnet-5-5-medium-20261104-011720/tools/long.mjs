import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const file = process.argv[2]; const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const p = await br.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(resolve(file)).href); await p.waitForTimeout(500);
const seen = new Set();
for (let i = 0; i < 130; i++) { await p.waitForTimeout(1000); const s = await p.evaluate(() => [My3D2dge.current.sceneName, !!AOA.attract, My3D2dge.current.errors.length].join('|')); seen.add(s.split('|').slice(0, 2).join('|')); if (i === 40) await p.screenshot({ path: 'test-output/attract40.png' }); }
console.log([...seen].join(' ; ')); console.log('errors', errs.slice(0, 5)); await br.close();
