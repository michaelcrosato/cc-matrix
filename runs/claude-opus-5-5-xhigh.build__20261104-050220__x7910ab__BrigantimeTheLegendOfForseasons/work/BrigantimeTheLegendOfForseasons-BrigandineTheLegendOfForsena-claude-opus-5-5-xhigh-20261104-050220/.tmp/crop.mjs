import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
const [img, x, y, w, h, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w * 3, height: +h * 3 } });
await p.setContent(`<body style="margin:0"><div style="width:${w * 3}px;height:${h * 3}px;background:url(file://${resolve(img)}) -${x * 3}px -${y * 3}px / ${1280 * 3}px auto no-repeat;image-rendering:pixelated"></div></body>`);
await p.goto('file://' + resolve(img)); await p.setViewportSize({ width: +w * 3, height: +h * 3 });
await p.evaluate(([x, y, w, h]) => { const i = document.querySelector('img'); i.style.cssText = `position:absolute;left:${-x * 3}px;top:${-y * 3}px;width:${i.naturalWidth * 3}px;image-rendering:pixelated`; document.body.style.margin = 0; }, [+x, +y, +w, +h]);
await p.screenshot({ path: out }); await b.close();
