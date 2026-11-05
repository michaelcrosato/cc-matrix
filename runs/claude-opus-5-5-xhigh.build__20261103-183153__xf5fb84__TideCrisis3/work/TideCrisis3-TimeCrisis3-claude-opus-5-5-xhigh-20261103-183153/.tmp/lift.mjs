import { chromium } from 'playwright';
import { resolve } from 'node:path';
process.env.TMPDIR = resolve('.tmp');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + resolve('../TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153.html')); await p.waitForFunction(() => window.TC && TC.game && TC.game.sceneName === 'title', null, { timeout: 30000 });
await p.evaluate(() => { TC.debug.start({ stage: 3, scene: '3-4', cheats: { god: true } }); }); await p.waitForTimeout(400); await p.evaluate(() => TC.debug.bot(true, 'expert'));
for (let k = 0; k < 3; k++) { await p.waitForTimeout(4000); await p.screenshot({ path: 'shots/lift_' + k + '.png' }); }
console.log('errors', errs); await b.close();
