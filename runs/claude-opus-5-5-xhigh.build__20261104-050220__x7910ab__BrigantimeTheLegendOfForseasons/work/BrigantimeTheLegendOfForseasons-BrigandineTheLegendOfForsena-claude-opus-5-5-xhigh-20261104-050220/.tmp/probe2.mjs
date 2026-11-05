import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + resolve('dist/index.html') + '#title'); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => { const E = My3D2dge, px = E.px, c = document.createElement('canvas'); c.width = 40; c.height = 12; const g = c.getContext('2d');
  const dump = () => { const d = g.getImageData(0, 0, 40, 12).data; let row = ''; for (let y = 0; y < 11; y++) { for (let x = 0; x < 38; x++) { const i = (y * 40 + x) * 4; row += d[i] > 200 ? '#' : d[i] > 60 ? '+' : d[i + 3] ? '.' : ' '; } row += '\n'; } return row; };
  px.rect(g, 2, 2, 30, 7, '#e8e4f0'); const a = dump();
  E.font.text(g, 'ENTER', 17, 2, '#1a1824', { align: 'center' }); return a + '----\n' + dump() + ' fillStyle=' + g.fillStyle; }));
await b.close();
