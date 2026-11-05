import { chromium } from '../engine/node_modules/playwright/index.mjs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
export default async t => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), name = path.basename(root), b = await chromium.launch(), page = await b.newPage({ viewport: { width: 640, height: 360 } }), errs = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(pathToFileURL(path.join(root, '..', name + '.html')).href + '#title'); await page.waitForTimeout(2500); await page.evaluate(() => My3D2dge.current.settings.set('camera', 'Tatami 2.5D'));
  for (const s of ['dojo', 'harbor', 'bamboo', 'log', 'ship', 'market', 'fuji', 'stadium']) {
    await page.evaluate(id => KC.game.go('fight', { stage: id, ids: ['taro', 'ebi'], players: ['cpu', 'cpu'], mode: 'versus', seed: 2 }, { fade: 0 }), s); await page.waitForTimeout(5500);
    const r = await page.evaluate(() => { const g = My3D2dge.current, d = g.screen.buf.getContext('2d').getImageData(0, 0, g.screen.W, g.screen.H).data, m = new Map(); for (let i = 0; i < d.length; i += 16) { const k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); m.set(k, (m.get(k) || 0) + 1); } let top = 0, n = 0; for (const v of m.values()) { top = Math.max(top, v); n += v; } return { view: g.view.id, filled: 1 - top / n, phase: KC.current.bout.phase }; });
    t.check(`Tatami 2.5D draws ${s} in the pitched view`, r.view === 'brawler' && r.filled > .3, JSON.stringify(r)); if (true) await page.screenshot({ path: path.join(root, 'tests/out', 'tatami_' + s + '.png') });
  }
  t.check('no errors in the 2.5D view', errs.length === 0, errs.slice(0, 2).join('|')); await b.close();
};
