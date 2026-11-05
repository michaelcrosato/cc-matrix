// Screenshot helper: node tools/shot.mjs "<hash>" out.png [waitMs] [w] [h] ["js to eval before shot"]
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [hash, out, wait = '1500', W = '1280', H = '720', js = ''] = process.argv.slice(2);
const file = path.resolve(DEV, '..', 'MashTV-SmashTV-claude-sonnet-5-5-medium-20261104-050302.html');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +W, height: +H } });
const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
await p.goto('file://' + file + (hash ? '#' + hash : ''));
await p.waitForTimeout(+wait);
if (js) { await p.evaluate(js); await p.waitForTimeout(800); }
await p.screenshot({ path: path.join(DEV, 'shots', out) });
const dbg = await p.evaluate(() => { try { return JSON.stringify(MT.game.debug.snapshot()).slice(0, 400) + ' errs:' + MT.game.errors.map(e => e.message || e).join('|'); } catch (e) { return 'nodbg ' + e.message; } });
console.log(dbg); if (errs.length) console.log(errs.slice(0, 8).join('\n'));
await b.close();
