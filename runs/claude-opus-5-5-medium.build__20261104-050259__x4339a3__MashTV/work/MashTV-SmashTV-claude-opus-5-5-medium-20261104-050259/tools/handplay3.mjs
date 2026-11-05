import { chromium } from 'playwright';
import { resolve } from 'node:path';
const FILE = 'file://' + resolve('../MashTV-SmashTV-claude-opus-5-5-medium-20261104-050259.html');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(FILE); await p.waitForTimeout(1800);
for (const k of ['ArrowDown', 'ArrowDown']) { await p.keyboard.press(k); await p.waitForTimeout(250); }
await p.keyboard.press('Enter'); await p.waitForTimeout(700);
const a = await p.evaluate(() => My3D2dge.current.sceneName);
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(250);
console.log(a, await p.evaluate(() => MT.howtoPanel.page)); await b.close();
