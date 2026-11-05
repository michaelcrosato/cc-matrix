// --browser: the bundle in headless Chromium at four window sizes (no errors, the canvas drawn); --hub: the AI Hub
// harness scenarios, served on 127.0.0.1 at a port the OS picks (our own server, stopped by its PID)
import { resolve } from 'node:path';
import { mkdirSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const NAME = 'TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153';
async function browserOf(t) { process.env.TMPDIR = resolve(new URL('.tmp', t.root).pathname); mkdirSync(process.env.TMPDIR, { recursive: true }); const { chromium } = await import('playwright'); return chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); }
export default {
  async browser(t) {
    const b = await browserOf(t), file = 'file://' + resolve(new URL('../' + NAME + '.html', t.root).pathname);
    for (const [w, h] of [[1920, 1080], [1280, 720], [2560, 1080], [1024, 768]]) {
      const page = await b.newPage({ viewport: { width: w, height: h } }), errs = [];
      page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await page.goto(file); await page.waitForTimeout(2500);
      await page.evaluate(() => TC.debug.start({ stage: 1, scene: '1-1' })); await page.waitForTimeout(2500);
      const snap = await page.evaluate(() => TC.debug.snapshot());
      t.check(w + 'x' + h + ': plays with no errors', errs.length === 0 && snap.scene === 'play' && snap.errors === 0, errs.slice(0, 2).join(' | '));
      const filled = await page.evaluate(() => { const c = document.getElementById('screen'); return c.width > 0 && c.height > 0; });
      t.check(w + 'x' + h + ': the canvas is drawn', filled);
      if (w === 1920) { const own = await page.evaluate(() => JSON.stringify(TC.ABOUT.exitInterview)), file = JSON.parse(readFileSync(new URL('../exit-interview.json', t.root), 'utf8')); t.check('the bundle\'s own exit interview is exit-interview.json, field for field', own === JSON.stringify(file)); }
      if (w === 1280) { await page.mouse.move(640, 300); await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(200); const sh = await page.evaluate(() => TC.play.sim.players[0].stats.shots); t.check('a mouse click fires', sh >= 1, sh); }
      await page.close();
    }
    await b.close();
  },
  async hub(t) {
    const dir = new URL('hubtest/', t.root).pathname; mkdirSync(dir, { recursive: true });
    copyFileSync(resolve(new URL('../' + NAME + '.html', t.root).pathname), dir + 'game.html');
    for (const f of ['harness.html', 'bridge.js', 'round.js', 'session.js']) copyFileSync(new URL('hub/' + f, t.root).pathname, dir + f);
    const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    const port = await new Promise((ok, no) => { let buf = ''; const f = d => { buf += d; const m = buf.match(/port (\d+)/); if (m) ok(+m[1]); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => no(new Error('no port')), 8000); });
    const b = await browserOf(t);
    try {
      const page0 = await b.newPage(); await page0.goto('http://127.0.0.1:' + port + '/game.html'); await page0.waitForTimeout(1500);
      t.check('the served page is our game', (await page0.title()) === 'Tide Crisis 3'); await page0.close();
      for (const q of ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']) {
        const page = await b.newPage({ viewport: { width: 1400, height: 900 } });
        await page.goto('http://127.0.0.1:' + port + '/harness.html?game=game.html&' + q);
        try { await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 240000 }); } catch (e) { /* reported below */ }
        const r = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, fails: (window.__hubCheck && (window.__hubCheck.checks || window.__hubCheck.results) || []).filter(c => c && (c.ok === false || c.pass === false)).map(c => c.name || c.label || JSON.stringify(c)).slice(0, 6) }));
        t.check('hub harness ' + q, r.pass === true, JSON.stringify(r.fails));
        await page.close();
      }
    } finally { await b.close(); srv.kill(); }
  }
};
