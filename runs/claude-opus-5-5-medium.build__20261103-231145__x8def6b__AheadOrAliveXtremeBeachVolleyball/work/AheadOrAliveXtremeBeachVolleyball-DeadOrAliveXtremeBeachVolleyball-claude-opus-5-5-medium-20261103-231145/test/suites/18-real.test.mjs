// the TASK.md features the audit checks headlessly, again in Chromium with real keyboard and touch events
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { build, NAME } from '../../tools/build.mjs';
export default async t => {
  build();
  const src = readdirSync(new URL('../../src/', import.meta.url)).map(f => [f, readFileSync(new URL('../../src/' + f, import.meta.url), 'utf8')]);
  const hits = src.flatMap(([f, s]) => s.split('\n').map((l, i) => [f, i + 1, l]).filter(([, , l]) => /\b(TODO|TBD|FIXME|XXX|HACK)\b|placeholder|lorem|not implemented|coming soon|\bstub(bed)?\b|throw new Error\(['"]unimplemented/i.test(l)));
  t('every source line is free of TODO / FIXME / placeholder / stub markers', !hits.length, hits.map(h => h.slice(0, 2).join(':')).join(' '));
  const emptyFns = src.flatMap(([f, s]) => [...s.matchAll(/(\w+)\s*\([^)]*\)\s*\{\s*\}/g)].map(m => f + ':' + m[1]).filter(x => !/catch/.test(x)));
  t('no empty function bodies', !emptyFns.length, emptyFns.join(' '));
  const url = 'file://' + new URL('../../../' + NAME + '.html', import.meta.url).pathname, b = await chromium.launch();
  try {
    // two players on one keyboard, through real key events: both move, and each one's hit key plays a touch
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(1500);
    await p.evaluate(() => AOA.go('exhibition', null, { fade: 0 })); await p.waitForTimeout(400);
    for (let k = 0; k < 5; k++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80); }
    await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    await p.keyboard.press('Digit2'); await p.waitForTimeout(400);
    t('real keys: player 2 joins with 2 on the keyboard', await p.evaluate(() => My3D2dge.current.players.length === 2 && AOA.SCENES.exhibition.pl.length === 2));
    await p.keyboard.press('KeyF'); await p.waitForTimeout(150); await p.keyboard.press('Period'); await p.waitForTimeout(800);
    t('real keys: both ready (F and .) and the match starts', await p.evaluate(() => My3D2dge.current.sceneName === 'match' && AOA.M.players.filter(q => q.isHuman).length === 2));
    await p.evaluate(() => { AOA.devPerfect = true; }); await p.waitForTimeout(3500);
    const mv = () => p.evaluate(() => My3D2dge.current.players.map(q => q.move()[1]));
    await p.keyboard.down('KeyS'); await p.waitForTimeout(120); const a = await mv(); await p.keyboard.up('KeyS'); await p.waitForTimeout(120);
    await p.keyboard.down('ArrowDown'); await p.waitForTimeout(120); const c = await mv(); await p.keyboard.up('ArrowDown'); await p.waitForTimeout(120);
    t('real keys: S steers only player 1 and the down arrow only player 2', a[0] > .5 && Math.abs(a[1]) < .1 && c[1] > .5 && Math.abs(c[0]) < .1, JSON.stringify([a, c]));
    // play: each human presses her own hit key when her contact comes; count touches by each
    await p.evaluate(() => { AOA.M._t = [0, 0]; AOA.bus.on('touch', e => { if (e.p.isHuman) AOA.M._t[e.p.side]++; }); });
    for (let k = 0; k < 400; k++) {
      const st = await p.evaluate(() => { const M = AOA.M; if (!M || My3D2dge.current.sceneName !== 'match') return null; const h = M.players.filter(q => q.isHuman); return h.map(q => ({ side: q.side, due: (q.plan && !q.pressed && M.clock >= q.plan.t - .03) || ((M.phase === 'serveSetup' && M.server === q && M.phT > .6) || (M.phase === 'toss' && M.server === q && M.clock >= M.tossApex - .03)) })); });
      if (!st) break; for (const s of st) if (s.due) await p.keyboard.press(s.side === 0 ? 'KeyF' : 'Period');
      const n = await p.evaluate(() => AOA.M._t); if (n[0] >= 1 && n[1] >= 1) break; await p.waitForTimeout(25);
    }
    const n = await p.evaluate(() => AOA.M && AOA.M._t);
    t('real keys: each player\'s own hit key plays her touches (F for P1, . for P2)', n && n[0] >= 1 && n[1] >= 1, JSON.stringify(n));
    t('real keys: no page errors', !errs.length, errs.join(' | '));
    await p.close();
    // a touch-only phone: the notice, no touch controls, a tap does not start play, the attract runs and a tap ends it
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /fine/.test(q) ? { matches: false, addEventListener() {}, removeEventListener() {} } : /coarse/.test(q) ? { matches: true, addEventListener() {}, removeEventListener() {} } : mm(q); });
    const q = await ctx.newPage(); await q.goto(url); await q.waitForTimeout(2000);
    await q.touchscreen.tap(200, 120); await q.waitForTimeout(600);
    t('touch device: a tap on the title does not start play', await q.evaluate(() => My3D2dge.current.sceneName === 'title' && AOA.touchOnly()));
    t('touch device: no touch buttons or stick', await q.evaluate(() => !document.querySelector('[data-sys="touch"]') && My3D2dge.current.input.touchEnabled === false));
    await q.waitForTimeout(10600); t('touch device: the attract mode runs', await q.evaluate(() => AOA.attract.active));
    await q.waitForTimeout(3000); await q.touchscreen.tap(400, 200); await q.waitForTimeout(800);
    t('touch device: a tap ends the attract', await q.evaluate(() => !AOA.attract.active && My3D2dge.current.sceneName === 'title'));
    await q.screenshot({ path: new URL('../../test-output/touch-real.png', import.meta.url).pathname });
    await ctx.close();
  } finally { await b.close(); }
};
