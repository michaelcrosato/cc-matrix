// A contact sheet of tests/out/*.png (eye review only)
import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('out/', import.meta.url), fs = readdirSync(dir).filter(f => f.endsWith('.png') && f !== 'sheet.png').sort(), cols = 3;
const html = '<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(' + cols + ',640px)">' + fs.map(f => `<div style="position:relative"><img src="data:image/png;base64,${readFileSync(new URL(f, dir)).toString("base64")}" width=640 height=360><span style="position:absolute;left:4px;top:4px;color:#0f0;font:14px monospace;background:#000">${f}</span></div>`).join('') + '</body>';
const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 640 * cols, height: 360 * Math.ceil(fs.length / cols) } });
await pg.setContent(html); await pg.waitForTimeout(500); await pg.screenshot({ path: new URL('sheet.png', dir).pathname, type: 'png' }); await br.close(); console.log(fs.length + ' in sheet');
