// node tests/browser/shot.mjs <page-relative-to-dev> <out.png> [waitMs] [w] [h] [steps-json]
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
process.env.TMPDIR = new URL('../../check-output/tmp/', import.meta.url).pathname;   // (the shared /tmp may be full)
const [,, page, out, wait = '1500', W = '1280', H = '720', steps = '[]'] = process.argv;
const DEV = new URL('../..', import.meta.url).pathname;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +W, height: +H } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(join(DEV, page.split('#')[0])).href + (page.includes('#') ? '#' + page.split('#')[1] : ''));
await p.waitForTimeout(+wait);
for (const s of JSON.parse(steps)) { if (s.key) { await p.keyboard.down(s.key); await p.waitForTimeout(s.ms || 100); await p.keyboard.up(s.key); } if (s.wait) await p.waitForTimeout(s.wait); if (s.eval) console.log(JSON.stringify(await p.evaluate(s.eval))); if (s.shot) await p.screenshot({ path: join(DEV, 'check-output', s.shot) }); }
await p.screenshot({ path: join(DEV, 'check-output', out) });
const snap = await p.evaluate(() => { const g = window.My3D2dge && My3D2dge.current; return g ? { errors: g.errors.map(e => e.where + ': ' + e.message), scene: g.sceneName, fps: g.fps } : null; });
console.log(JSON.stringify({ errs, snap }));
await b.close();
