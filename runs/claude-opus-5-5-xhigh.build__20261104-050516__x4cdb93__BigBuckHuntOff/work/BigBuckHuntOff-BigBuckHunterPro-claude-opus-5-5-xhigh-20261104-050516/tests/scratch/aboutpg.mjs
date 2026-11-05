import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(resolve('../BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-xhigh-20261104-050516.html')).href + '#about'); await p.waitForTimeout(2500);
for (const n of process.argv.slice(2).map(Number)) { await p.evaluate(n => { const s = My3D2dge.current.scene; s.i = n; }, n); await p.waitForTimeout(300); await p.screenshot({ path: 'tests/out/about-' + n + '.png' }); }
await b.close();
