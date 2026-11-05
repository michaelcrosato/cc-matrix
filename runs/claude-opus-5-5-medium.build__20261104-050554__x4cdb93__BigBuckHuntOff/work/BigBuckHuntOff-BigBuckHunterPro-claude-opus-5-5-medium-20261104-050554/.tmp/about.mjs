import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto('file://' + process.argv[2] + '#about'); await p.waitForTimeout(3000);
for (let k = 0; k < 4; k++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); }
await p.screenshot({ path: 'tests/out/about-fb.png' }); await b.close();
