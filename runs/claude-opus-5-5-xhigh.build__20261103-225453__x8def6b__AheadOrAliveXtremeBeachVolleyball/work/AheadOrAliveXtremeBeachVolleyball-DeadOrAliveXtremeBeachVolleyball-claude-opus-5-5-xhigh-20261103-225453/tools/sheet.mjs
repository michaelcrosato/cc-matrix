// A contact sheet of screenshots: node tools/sheet.mjs <out.png> <cols> <img...>  (each tile 640x360, labelled)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
const [out, cols, ...imgs] = process.argv.slice(2), C = +cols || 3, tw = 640, th = 360;
const tiles = imgs.map(f => `<div style="position:relative;width:${tw}px;height:${th}px;display:inline-block"><img src="data:image/png;base64,${readFileSync(f).toString('base64')}" style="width:${tw}px;height:${th}px;image-rendering:pixelated"><span style="position:absolute;left:4px;top:4px;background:#000c;color:#ff0;font:bold 18px monospace;padding:2px 6px">${basename(f, '.png')}</span></div>`).join('');
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: tw * C, height: th * Math.ceil(imgs.length / C) } });
await p.setContent(`<body style="margin:0;background:#222;line-height:0">${tiles}</body>`); await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true }); await b.close(); console.log(out);
