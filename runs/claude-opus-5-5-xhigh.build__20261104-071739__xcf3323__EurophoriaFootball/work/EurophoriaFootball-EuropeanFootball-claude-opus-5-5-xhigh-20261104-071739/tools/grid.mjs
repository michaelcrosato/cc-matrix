// node tools/grid.mjs out.png a.png b.png ... : a 2-column contact sheet (each 640x360)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [out, ...ins] = process.argv.slice(2);
const rows = Math.ceil(ins.length / 2);
const html = '<body style="margin:0;background:#000;display:grid;grid-template-columns:640px 640px">' + ins.map(f => `<img style="width:640px;height:360px;image-rendering:pixelated" src="data:image/png;base64,${readFileSync(f).toString('base64')}">`).join('') + '</body>';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: rows * 360 } });
await p.setContent(html); await p.waitForTimeout(200); await p.screenshot({ path: out }); await b.close();
