import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 480, height: 270 }, deviceScaleFactor: 4 });
await p.goto('file://' + process.argv[2] + '#menu'); await p.waitForTimeout(5000);
await p.screenshot({ path: process.argv[3], clip: { x: 160, y: 250, width: 160, height: 20 } }); await b.close();
