import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/vendor/my-3d2dge/dist/handoff/package.json');
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage();
await p.addInitScript(() => { const w = console.warn; console.warn = (...a) => { if (String(a[0]).includes('undefined')) w.call(console, 'STACK ' + new Error().stack.split('\n').slice(2, 9).join(' <- ')); w.apply(console, a); }; });
p.on('console', m => { if (m.text().startsWith('STACK')) console.log(m.text().slice(0, 900)); });
await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForTimeout(2500); await b.close();
