// node tools/sheet.mjs out.png a.png b.png ... : a contact sheet (2 columns, half size) of screenshots
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const DEV = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(path.join(DEV, 'vendor/my-3d2dge/dist/handoff/package.json'));
const { chromium } = require('playwright');
const [out, ...ims] = process.argv.slice(2);
const html = '<body style="margin:0;background:#000;display:grid;grid-template-columns:640px 640px;gap:2px">' + ims.map(f => `<img src="file://${path.resolve(f)}" style="width:640px">`).join('') + '</body>';
const tmp = path.join(DEV, '.tmp', 'sheet.html'); fs.writeFileSync(tmp, html);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1282, height: 360 * Math.ceil(ims.length / 2) + 4 } });
await p.goto('file://' + tmp); await p.waitForTimeout(300); await p.screenshot({ path: path.resolve(out), fullPage: true }); await b.close();
