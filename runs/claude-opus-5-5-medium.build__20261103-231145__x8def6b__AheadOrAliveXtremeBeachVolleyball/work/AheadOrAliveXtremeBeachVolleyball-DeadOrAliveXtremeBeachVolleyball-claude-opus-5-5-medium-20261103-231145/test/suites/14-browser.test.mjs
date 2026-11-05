// the built page in Chromium from file://: a tour with no console errors, the attract after 10 s idle, the touch-only gate
import { chromium } from 'playwright';
import { build, NAME } from '../../tools/build.mjs';
export default async t => {
  build();
  const url = 'file://' + new URL('../../../' + NAME + '.html', import.meta.url).pathname;
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    await p.goto(url); await p.waitForTimeout(2000);
    t('boots to the title', await p.evaluate(() => My3D2dge.current.sceneName) === 'title');
    const filled = await p.evaluate(() => { const c = document.getElementById('screen'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 64) if (d[i] + d[i + 1] + d[i + 2] > 30) n++; return n / (d.length / 64); });
    t('the title has pixels', filled > .5, filled);
    await p.waitForTimeout(9500); t('the attract starts after 10 s idle', await p.evaluate(() => AOA.attract.active));
    await p.keyboard.press('Enter'); await p.waitForTimeout(800); t('a key returns to the title', await p.evaluate(() => !AOA.attract.active && My3D2dge.current.sceneName === 'title'));
    await p.keyboard.press('Enter'); await p.waitForTimeout(600); t('the menu opens', await p.evaluate(() => My3D2dge.current.sceneName) === 'menu');
    await p.evaluate(() => AOA.startMatch({ mode: 'exhibition', pointsToWin: 7, teams: [[{ id: 'rin', suit: 'seigaiha', acc: [], input: My3D2dge.current.input }, { id: 'lola', suit: 'estrella', acc: [] }], [{ id: 'tess', suit: 'reefbreak', acc: [] }, { id: 'mei', suit: 'peony', acc: [] }]] }, { fade: 0 }));
    for (let k = 0; k < 20; k++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
    t('a match plays', await p.evaluate(() => My3D2dge.current.sceneName === 'match' && AOA.M.phase !== 'intro'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(500); t('Escape pauses', await p.evaluate(() => My3D2dge.current.paused));
    const items = await p.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()));
    t('the pause menu lists Dev Mode and How to Play', items.some(s => /Dev Mode/.test(s)) && items.some(s => /How to Play/.test(s)), items.join(','));
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /Dev Mode/.test(b.textContent)); b && b.click(); }); await p.waitForTimeout(400);
    t('Dev Mode opens from the pause menu', await p.evaluate(() => AOA.overlay.has('dev')));
    await p.keyboard.press('Backspace'); await p.waitForTimeout(300);
    t('no console errors on the tour', errs.length === 0, errs.slice(0, 4).join(' | '));
    await p.screenshot({ path: new URL('../../test-output/browser-match.png', import.meta.url).pathname });
    await p.close();
    // a touch-only device: the gate shows, no touch controls
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    await ctx.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /any-pointer: fine|pointer: fine/.test(q) ? { matches: false, addEventListener() {}, removeEventListener() {} } : /coarse/.test(q) ? { matches: true, addEventListener() {}, removeEventListener() {} } : mm(q); });
    const q = await ctx.newPage(); await q.goto(url); await q.waitForTimeout(2200);
    t('touch-only: the gate shows', await q.evaluate(() => AOA.touchOnly()));
    t('touch-only: no touch buttons', await q.evaluate(() => !document.querySelector('[data-sys="touch"]')));
    await q.screenshot({ path: new URL('../../test-output/touch-gate.png', import.meta.url).pathname });
    await ctx.close();
  } finally { await b.close(); }
};
