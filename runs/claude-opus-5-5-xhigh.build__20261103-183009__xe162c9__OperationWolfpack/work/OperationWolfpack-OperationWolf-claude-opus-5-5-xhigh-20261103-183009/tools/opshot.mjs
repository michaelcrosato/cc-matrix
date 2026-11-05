// node tools/opshot.mjs op beat seconds out.png [--size 960x540]: jump to op/beat with the god bot playing, then screenshot
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [op, beat, secs, out] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(pathToFileURL(resolve('dev/index.html')).href + '#title');
await page.waitForTimeout(1200);
await page.evaluate(([op, beat]) => { const g = My3D2dge.current; WP.Dev.cheats.god = true; WP.Dev.cheats.ammo = true; WP.Flow.newRun({}); WP.Flow.run.single = true; g.debug.jump(op, beat); }, [op, beat]);
await page.waitForTimeout(500);
await page.evaluate(() => { const b = WP.Bot.make({}); My3D2dge.current.debug.frames(0, (w, p, dt) => WP.Bot.frame(b, w, p, dt)); });
await page.waitForTimeout(+secs * 1000);
await page.screenshot({ path: out });
const snap = await page.evaluate(() => { const s = My3D2dge.current.debug.snapshot(); return { scene: s.scene, d: s.d, state: s.state, beat: s.beat, boss: s.boss, errors: My3D2dge.current.errors.map(e => String(e.message).slice(0, 200)) }; });
console.log(JSON.stringify(snap)); for (const e of errs) console.log('ERR', e.slice(0, 300));
await browser.close();
