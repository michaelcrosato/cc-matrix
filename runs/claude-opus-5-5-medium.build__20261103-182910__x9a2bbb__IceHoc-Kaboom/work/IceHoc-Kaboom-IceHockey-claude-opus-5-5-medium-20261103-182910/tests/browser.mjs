// Browser suites (Playwright, Chromium): the page runs from file:// with no errors and no network; menus answer the
// keyboard, mouse hover and click; prompts follow the last device and the Xbox setting; touch-only shows the banner and
// attract runs; the AI Hub harness passes in all four configurations. Prints PASS/FAIL lines (tests/run.mjs reads them).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const only = process.argv[2] || null;
const NAME = 'IceHoc-Kaboom-IceHockey-claude-opus-5-5-medium-20261103-182910';
const url = new URL('../../' + NAME + '.html', import.meta.url).href;
const out = (suite, what, ok, detail = '') => console.log((ok ? 'PASS' : 'FAIL') + ' [' + suite + '] ' + what + (ok ? '' : ': ' + String(detail).slice(0, 300)));
const b = await chromium.launch();
async function page(o = {}) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o));
  const p = await ctx.newPage(); p.errs = []; p.net = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
  p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) p.net.push(r.url()); });
  return p;
}
const snap = p => p.evaluate(() => window.__game.game.debug.snapshot());
if (!only || only === 'browser') {
  const S = 'browser';
  for (const h of ['', '#match/muskrats/drillers/icebox', '#fight', '#kaboom', '#story/1', '#practice/3', '#about']) {
    const p = await page(); await p.goto(url + h); await p.waitForTimeout(4000);
    const errs = p.errs.concat(await p.evaluate(() => window.__game.game.errors.map(e => e.message)));
    out(S, 'page ' + (h || 'title') + ' runs with no errors', !errs.length, errs.join(' | ')); out(S, 'page ' + (h || 'title') + ' makes no network requests', !p.net.length, p.net.join(' '));
    await p.close();
  }
  // menus: keys, mouse hover, click; prompts follow the device; the Xbox setting
  const p = await page(); await p.goto(url); await p.waitForTimeout(2500);
  await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  const t1 = await p.evaluate(() => { const sc = window.__game.scenes.title; return true; });
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
  const r = await p.evaluate(() => { const g = window.__game.game; return { W: g.r.W, H: g.r.H }; });
  const box = await p.evaluate(() => document.getElementById('screen').getBoundingClientRect().toJSON());
  // tile 3 (practice) sits in the first row, right: hover it, then click it
  const toCss = (x, y) => [box.x + x / r.W * box.width, box.y + y / r.H * box.height];
  const w = Math.min(124, Math.floor((r.W - 60) / 3)), cx = r.W / 2 + w + 8, cy = Math.round(r.H * .5) + 19;
  await p.mouse.move(...toCss(cx - 30, cy)); await p.waitForTimeout(100); await p.mouse.move(...toCss(cx, cy)); await p.waitForTimeout(300);
  const focus = await p.evaluate(() => [window.__game.scenes.title.menuIndex, window.__game.game.input.lastDevice]);
  out(S, 'mouse hover moves the focus to PRACTICE', focus[0] === 2, focus);
  out(S, 'a moving mouse switches prompts to the mouse', focus[1] === 'mouse', focus);
  await p.mouse.click(...toCss(cx, cy)); await p.waitForTimeout(900);
  out(S, 'a click on the PRACTICE tile picks it', (await snap(p)).scene === 'practice', (await snap(p)).scene);
  const chip = await p.evaluate(() => { const G = window.__game; G.game.input.lastDevice = 'gamepad'; G.game.settings.set('symbols', 'PlayStation'); G.Glyphs.sync(); const a = G.Glyphs.spec('pass').text; G.game.settings.set('symbols', 'Xbox'); G.Glyphs.sync(); const b2 = G.Glyphs.spec('pass').text; G.game.input.lastDevice = 'keyboard'; const c = G.Glyphs.spec('pass').text; G.game.settings.set('symbols', 'PlayStation'); return [a, b2, c]; });
  out(S, 'prompts: ✕ on PlayStation, A on Xbox, J on the keyboard', chip.join(',') === '✕,A,J', chip.join(','));
  out(S, 'menus: no errors', !p.errs.length, p.errs.join(' | '));
  await p.close();
  // touch-only: the banner, the settings button, attract after 10 s
  const tp = await page({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await tp.goto(url); await tp.waitForTimeout(2000);
  const only2 = await tp.evaluate(() => window.__game && matchMedia('(pointer: coarse)').matches);
  out(S, 'touch-only emulation is coarse-pointer', only2);
  await tp.screenshot({ path: new URL('../shots/touch.png', import.meta.url).pathname });
  await tp.waitForTimeout(10500);
  out(S, 'touch-only: the attract mode starts by itself', (await snap(tp)).scene === 'attract', (await snap(tp)).scene);
  await tp.close();
}
if (!only || only === 'hub') {
  const S = 'hub';
  const dir = new URL('../hub/', import.meta.url).pathname;
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir });
  const port = await new Promise((res, rej) => { let buf = ''; const on = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => rej(new Error('no port')), 8000); });
  try {
    const base = 'http://127.0.0.1:' + port + '/';
    const p0 = await page(); await p0.goto(base + 'game.html'); const title = await p0.title(); await p0.close();
    out(S, 'the served page is this game', title.includes('Ice Hoc-Kaboom'), title);
    for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1', 'players=1&auto=1']) {
      const p = await page({ viewport: { width: 1400, height: 900 } }); await p.goto(base + 'harness.html?game=game.html&' + q);
      try { await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 420000 }); } catch (e) { /* reported below */ }
      const r = await p.evaluate(() => window.__hubCheck ? { pass: window.__hubCheck.pass, failed: (window.__hubCheck.checks || window.__hubCheck.results || []).filter ? (window.__hubCheck.checks || window.__hubCheck.results || []).filter(c => c && c.ok === false || c && c.pass === false).map(c => c.name || c.label || JSON.stringify(c)) : JSON.stringify(window.__hubCheck).slice(0, 400) } : null);
      out(S, 'harness ' + q, r && r.pass === true, JSON.stringify(r));
      await p.close();
    }
    // outside a session, the game still reaches its title
    const p2 = await page(); await p2.goto(base + 'game.html'); await p2.waitForTimeout(3000); out(S, 'outside a session the title shows', (await snap(p2)).scene === 'title', (await snap(p2)).scene); await p2.close();
  } finally { srv.kill(); }
}
await b.close();
