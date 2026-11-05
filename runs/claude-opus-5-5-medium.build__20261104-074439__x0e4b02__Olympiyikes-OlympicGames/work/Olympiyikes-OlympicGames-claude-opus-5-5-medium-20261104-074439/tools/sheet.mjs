// Combines screenshots into one contact sheet (Playwright renders an HTML grid of the PNGs): node tools/sheet.mjs out.png a.png b.png ...
import { createRequire } from 'node:module'; import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../vendor/my-3d2dge/dist/handoff/package.json', import.meta.url));
const { chromium } = require('playwright');
const [out, ...files] = process.argv.slice(2);
const imgs = files.map(f => '<div><img src="data:image/png;base64,' + readFileSync(f).toString('base64') + '"><p>' + f.split('/').pop() + '</p></div>').join('');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.setContent('<style>body{margin:0;background:#222;display:grid;grid-template-columns:1fr 1fr;gap:4px}img{width:100%;display:block}p{color:#fff;margin:0;font:12px sans-serif}</style>' + imgs);
await p.screenshot({ path: out, fullPage: true }); await b.close();
