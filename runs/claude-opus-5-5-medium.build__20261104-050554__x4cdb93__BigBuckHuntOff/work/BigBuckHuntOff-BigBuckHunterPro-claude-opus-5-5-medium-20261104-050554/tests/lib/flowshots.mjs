import { chromium } from 'playwright';
const F = 'file://' + process.argv[2];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(F + '#hunt/hollow/1'); await p.waitForTimeout(12000);
await p.evaluate(() => { const pl = BB.play.players[0]; const a = BB.play.site.herd.list.find(x => x.cat === 'animal' && x.legal && x.live); if (a) { const pt = BB.aimPointOf(a, 'heart'), P = BB.play.site.lens.project(...pt); pl.ret = [P[0], P[1]]; } pl.scoped = true; pl.scopeK = 1; });

await p.keyboard.down('KeyL'); await p.waitForTimeout(600);
await p.screenshot({ path: 'tests/out/f-scope.png' }); await p.keyboard.up('KeyL');
await p.evaluate(() => BB.bagAll()); await p.waitForTimeout(500); await p.screenshot({ path: 'tests/out/f-cam.png' });
await p.waitForTimeout(3000); await p.evaluate(() => BB.skipSegment()); await p.waitForTimeout(2500); await p.screenshot({ path: 'tests/out/f-tally1.png' });
await p.keyboard.press('Enter'); await p.waitForTimeout(900); await p.screenshot({ path: 'tests/out/f-tally2.png' });
console.log(errs.join('|') || 'no errors'); await b.close();
