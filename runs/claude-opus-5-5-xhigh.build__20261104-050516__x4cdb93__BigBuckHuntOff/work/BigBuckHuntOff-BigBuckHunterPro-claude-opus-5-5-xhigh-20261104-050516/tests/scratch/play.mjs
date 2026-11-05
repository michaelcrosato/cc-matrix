// screenshots of the real bundle at a deep link: node tests/scratch/play.mjs '#hunt/hollow/1' out.png 14000 [bot]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [hash, out = 'tests/out/play.png', wait = '12000', bot = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
await p.goto(pathToFileURL(resolve('../BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-xhigh-20261104-050516.html')).href + hash);
await p.waitForTimeout(2500);
if (bot) await p.evaluate(s => My3D2dge.current.debug.bot(true, { skill: s || 'expert', cheat: true }), bot);
const shots = (process.env.SHOTS || '').split(',').filter(Boolean).map(Number);
let t0 = 2500;
for (const s of shots) { await p.waitForTimeout(s - t0); t0 = s; await p.screenshot({ path: out.replace('.png', '-' + s + '.png') }); }
await p.waitForTimeout(Math.max(0, +wait - t0));
await p.screenshot({ path: out });
const snap = await p.evaluate(() => { const g = My3D2dge.current; return { snap: g.debug.snapshot(), fps: g.fps, errors: g.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]) }; });
console.log(JSON.stringify({ seg: snap.snap.segment, site: snap.snap.site, t: snap.snap.siteTime, score: (snap.snap.players[0] || {}).score, fps: snap.fps, actors: snap.snap.actors.length, errors: snap.errors.slice(0, 4) }));
console.log(errs.slice(0, 8).join('\n') || 'no console errors');
await b.close();
