import { chromium } from 'playwright'; import fs from 'node:fs';
// usage: node pageshot.mjs <url> <out.png> <steps.json>   steps: [["wait",ms],["key","Enter"],["down","KeyW"],["up","KeyW"],["eval","js"],["shot","path"]]
const [url, out, stepsFile] = process.argv.slice(2);
const steps = stepsFile ? JSON.parse(fs.readFileSync(stepsFile, 'utf8')) : [['wait', 8000]];
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('console', m => { const t = m.text(); if (!/deprecated|No available adapters|WebGPURenderer|AudioContext/.test(t)) console.log('[c]', t.slice(0,300)); }); p.on('pageerror', e => console.log('[err]', e.message.slice(0,500)));
await p.goto(url);
for (const [k, v] of steps) { if (k === 'wait') await p.waitForTimeout(+v); else if (k === 'key') await p.keyboard.press(v); else if (k === 'down') await p.keyboard.down(v); else if (k === 'up') await p.keyboard.up(v); else if (k === 'eval') console.log('[eval]', JSON.stringify(await p.evaluate(v))); else if (k === 'shot') await p.screenshot({ path: v }); }
await p.screenshot({ path: out }); await b.close();
