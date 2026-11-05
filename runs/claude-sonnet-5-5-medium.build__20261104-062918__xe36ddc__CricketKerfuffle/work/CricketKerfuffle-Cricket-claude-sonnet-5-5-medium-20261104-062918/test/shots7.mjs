import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(pathToFileURL(resolve('../CricketKerfuffle-Cricket-claude-sonnet-5-5-medium-20261104-062918.html')).href); await p.waitForTimeout(1500);
await p.evaluate(`My3D2dge.current.debug.titleState.touchOnly=true`); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/touch.png' });
await p.evaluate(`My3D2dge.current.debug.titleState.touchOnly=false; My3D2dge.current.go('about')`); await p.waitForTimeout(900);
for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200); }
await p.screenshot({ path: 'shots/about-last.png' });
await b.close();
