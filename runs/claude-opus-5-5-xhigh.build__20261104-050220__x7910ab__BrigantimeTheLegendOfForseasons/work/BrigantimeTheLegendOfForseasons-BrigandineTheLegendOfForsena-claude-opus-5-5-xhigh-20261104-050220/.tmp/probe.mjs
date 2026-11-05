import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + resolve('dist/index.html') + '#title'); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => { const G = BRIG, c = document.createElement('canvas'); c.width = 40; c.height = 12; const g = c.getContext('2d'); const w = G.keycap(g, 1, 1, 'ENTER', '#e8e4f0', '#1a1824'); const d = g.getImageData(0, 0, 40, 12).data; const px = (x, y) => Array.from(d.slice((y * 40 + x) * 4, (y * 40 + x) * 4 + 4)).join(','); let row = ''; for (let y = 0; y < 11; y++) { for (let x = 0; x < 38; x++) { const i = (y * 40 + x) * 4; row += d[i] > 200 ? '#' : d[i] > 60 ? '+' : d[i + 3] ? '.' : ' '; } row += '\n'; } return row + 'w=' + w + ' p(3,3)=' + px(3, 3) + ' p(2,8)=' + px(2, 8) + ' tones=' + JSON.stringify(My3D2dge.tones('#e8e4f0')); }));
await b.close();
