// screenshots of the built game: node tools/shot.mjs out.png "js to run in the page" waitMs [w h]
import { chromium } from 'playwright';
import { NAME } from './build.mjs';
const [out, js = '', wait = '1500', w = '1280', h = '720'] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + new URL('../../' + NAME + '.html', import.meta.url).pathname);
await p.waitForTimeout(1500);
for (const step of js.split(';;')) { if (!step.trim()) continue; if (/^wait:/.test(step)) { await p.waitForTimeout(+step.slice(5)); continue; } if (/^key:/.test(step)) { await p.keyboard.press(step.slice(4)); continue; } await p.evaluate(step); }
await p.waitForTimeout(+wait);
await p.screenshot({ path: out });
console.log(JSON.stringify(await p.evaluate(() => { const g = My3D2dge.current; return { scene: g.sceneName, errors: g.errors.map(e => e.message), snap: g.debug && g.debug.snapshot().match && g.debug.snapshot().match.phase }; })), errs.slice(0, 5));
await b.close();
