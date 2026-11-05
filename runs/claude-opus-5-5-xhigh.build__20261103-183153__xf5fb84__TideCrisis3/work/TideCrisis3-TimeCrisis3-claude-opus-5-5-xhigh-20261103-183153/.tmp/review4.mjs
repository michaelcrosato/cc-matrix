import { chromium } from 'playwright';
import { resolve } from 'node:path';
process.env.TMPDIR = resolve('.tmp');
const b = await chromium.launch();
const file = 'file://' + resolve('../TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153.html');
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file); await p.waitForFunction(() => window.TC && TC.game && TC.game.sceneName === 'title', null, { timeout: 30000 });
for (const [st, sc, w] of [[1, '1-2', 5000], [1, '1-4', 9000], [2, '2-1', 5000], [2, '2-2', 5000], [2, '2-4', 5000], [3, '3-1', 6000], [3, '3-4', 9000]]) {
  await p.evaluate(([st, sc]) => { TC.debug.start({ stage: st, scene: sc, cheats: { god: true } }); }, [st, sc]); await p.waitForTimeout(400); await p.evaluate(() => TC.debug.bot(true, 'expert'));
  await p.waitForTimeout(w); await p.screenshot({ path: 'shots/review_area_' + sc + '.png' });
}
console.log('errors', errs, await p.evaluate(() => TC.game.errors.length)); await b.close();
