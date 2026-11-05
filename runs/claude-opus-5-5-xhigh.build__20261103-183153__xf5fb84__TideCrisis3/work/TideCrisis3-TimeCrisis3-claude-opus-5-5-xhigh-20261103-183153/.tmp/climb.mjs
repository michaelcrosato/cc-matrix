import { chromium } from 'playwright';
import { resolve } from 'node:path';
process.env.TMPDIR = resolve('.tmp');
const b = await chromium.launch();
const file = 'file://' + resolve('../TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153.html');
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file); await p.waitForFunction(() => window.TC && TC.game && TC.game.sceneName === 'title', null, { timeout: 30000 });
const scene = process.argv[2] || '2-B', stage = +(process.argv[3] || 2), n = +(process.argv[4] || 6), dt = +(process.argv[5] || 600);
await p.evaluate(([stage, scene]) => { TC.debug.start({ stage, scene, cheats: { god: true } }); TC.game.timeScale = 1; }, [stage, scene]);
for (let k = 0; k < n; k++) { await p.waitForTimeout(dt); const s = await p.evaluate(() => { const S = TC.play.sim, c = S.cameraFor(0); return S.phase + ' ' + [c.x, c.y, c.z].map(v => v.toFixed(0)).join(',') + ' r ' + Math.hypot(c.x - 1560, c.y).toFixed(0); }); console.log(k, s); await p.screenshot({ path: 'shots/climb_' + scene + '_' + k + '.png' }); }
console.log(errs); await b.close();
