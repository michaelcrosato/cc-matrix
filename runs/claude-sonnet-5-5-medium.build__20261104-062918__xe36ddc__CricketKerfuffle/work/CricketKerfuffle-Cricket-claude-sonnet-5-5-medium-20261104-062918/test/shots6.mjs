import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(resolve('../CricketKerfuffle-Cricket-claude-sonnet-5-5-medium-20261104-062918.html')).href); await p.waitForTimeout(1500);
await p.evaluate(`My3D2dge.current.go('about')`); await p.waitForTimeout(900);
for (let i = 0; i < 9; i++) { await p.screenshot({ path: `shots/about${i}.png` }); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250); }
await b.close();
