// a contact sheet of screenshots (3 columns, 640x360): node tools/sheet.mjs out.png a.png b.png ...
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [out, ...files] = process.argv.slice(2);
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1920, height: Math.ceil(files.length / 3) * 360 } });
await p.setContent('<body style="margin:0;background:#111;display:flex;flex-wrap:wrap">' + files.map(f => `<div style="position:relative;width:640px;height:360px"><img style="width:640px;height:360px" src="data:image/png;base64,${readFileSync(f).toString('base64')}"><span style="position:absolute;left:6px;top:4px;color:#ff0;font:14px monospace">${f.split('/').pop()}</span></div>`).join('') + '</body>');
await p.screenshot({ path: out }); await b.close();
