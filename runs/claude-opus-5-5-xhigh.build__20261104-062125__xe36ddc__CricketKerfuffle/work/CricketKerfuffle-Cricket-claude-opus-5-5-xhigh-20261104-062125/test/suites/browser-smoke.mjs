import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
export async function run(check) {
  let chromium; try { chromium = createRequire(new URL('../../engine/package.json', import.meta.url))('playwright').chromium; } catch (e) { check('Playwright is installed (cd engine && npm install && npx playwright install chromium)', false, e.message); return; }
  const file = new URL('../../../CricketKerfuffle-Cricket-claude-opus-5-5-xhigh-20261104-062125.html', import.meta.url), out = new URL('../out/', import.meta.url); mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const cases = [['', 427, 240, 2500], ['match', 427, 240, 6000], ['bowl', 427, 240, 5000], ['match:dome:thr', 640, 270, 5000], ['match:bay:lar', 320, 690, 5000], ['nets', 427, 240, 2000], ['showdown', 427, 240, 2000], ['about', 427, 240, 1500], ['storymap', 427, 240, 1500], ['attract:4', 427, 240, 6000], ['chapter:1:pre', 427, 240, 3000], ['dev', 427, 240, 2500]];
  for (const [hash, w, h, wait] of cases) {
    const page = await browser.newPage({ viewport: { width: w * 2, height: h * 2 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /my-3D2dge:/.test(m.text())) errs.push(m.text()); });
    await page.goto(file.href + (hash ? '#' + hash : '')); await page.waitForTimeout(wait);
    const s = await page.evaluate(() => { try { const s = window.__game.debug.snapshot(); return { scene: s.scene, errors: s.errors }; } catch (e) { return { err: String(e) }; } });
    await page.screenshot({ path: new URL('smoke-' + (hash || 'title').replace(/[:]/g, '-') + '-' + w + 'x' + h + '.png', out).pathname });
    check('#' + (hash || 'title') + ' at ' + w + 'x' + h + ': no page errors or engine warnings', !errs.length && s.errors && !s.errors.length, { errs: errs.slice(0, 4), s });
    check('#' + (hash || 'title') + ' at ' + w + 'x' + h + ': the expected scene', !s.err && (hash ? s.scene === ({ '': 'title', bowl: 'match', dev: 'match' }[hash] || hash.split(':')[0].replace('chapter', 'cutscene')) || (hash.startsWith('match') && s.scene === 'match') : s.scene === 'title'), s);
    await page.close();
  }
  await browser.close();
}
