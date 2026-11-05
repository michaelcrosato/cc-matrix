import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { serve } from '../../tools/serve.mjs';
export async function run(check) {
  let chromium; try { chromium = createRequire(new URL('../../engine/package.json', import.meta.url))('playwright').chromium; } catch (e) { check('Playwright is installed', false, e.message); return; }
  const dir = new URL('../hub/', import.meta.url); mkdirSync(dir, { recursive: true });
  copyFileSync(new URL('../../../CricketKerfuffle-Cricket-claude-opus-5-5-xhigh-20261104-062125.html', import.meta.url), new URL('game.html', dir));
  for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(new URL('../../vendor/aihub/' + f, import.meta.url), new URL(f, dir));
  const srv = await serve(dir.pathname);
  try {
    const browser = await chromium.launch();
    const probe = await browser.newPage(); await probe.goto('http://127.0.0.1:' + srv.port + '/game.html');
    check('the server serves our game (its title)', (await probe.title()) === 'Cricket Kerfuffle', await probe.title()); await probe.close();
    for (const q of ['players=1', 'players=2', 'players=4&latency=150&jitter=50&loss=5']) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errs = [];
      page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /my-3D2dge:/.test(m.text())) errs.push(m.text()); });
      await page.goto('http://127.0.0.1:' + srv.port + '/harness.html?game=game.html&' + q + '&auto=1');
      if (q === 'players=2') { await page.waitForTimeout(6000); await page.screenshot({ path: new URL('../out/hub-card.png', import.meta.url).pathname }); await page.waitForTimeout(14000); await page.screenshot({ path: new URL('../out/hub-round.png', import.meta.url).pathname }); }
      try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }); } catch (e) { /* reported below */ }
      const r = await page.evaluate(() => { const c = window.__hubCheck || {}; return { pass: c.pass, complete: document.body.dataset.complete, failed: (c.checks || c.results || []).filter ? (c.checks || c.results || []).filter(x => x && (x.ok === false || x.pass === false || x.status === 'fail')).map(x => x.name + ': ' + (x.detail || x.message || '')) : JSON.stringify(c).slice(0, 600) }; });
      check('AI Hub harness ' + q + ': the round completes and passes', r.pass === true, r);
      check('AI Hub harness ' + q + ': no page errors, console errors or engine warnings', !errs.length, errs.slice(0, 4));
      await page.close();
    }
    await browser.close();
  } finally { srv.stop(); }
}
